import fs from 'fs';
import path from 'path';

// Parse .env if needed
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value.trim();
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || '';
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'ck_5v-DzhM9d_7hffsVXe9x';

const headers = {
  apikey: SUPABASE_KEY,
  authorization: `Bearer ${SUPABASE_KEY}`,
  'content-type': 'application/json'
};

/**
 * Calls Composio MCP endpoint directly via HTTP JSON-RPC
 */
async function callComposio(tools) {
  const res = await fetch('https://connect.composio.dev/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'x-consumer-api-key': COMPOSIO_API_KEY
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'COMPOSIO_MULTI_EXECUTE_TOOL',
        arguments: { tools }
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Composio HTTP ${res.status}: ${await res.text()}`);
  }

  const text = await res.text();
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      const payload = JSON.parse(line.slice(6));
      if (payload.error) throw new Error(payload.error.message || JSON.stringify(payload.error));
      const resText = payload.result?.content?.[0]?.text;
      if (resText) {
        return JSON.parse(resText);
      }
    }
  }
  throw new Error('Respuesta inválida recibida de Composio');
}

/**
 * Connects directly to Instagram Graph API via Composio to fetch live metrics
 */
async function refreshLiveInstagramInsights(insightsPath) {
  if (!COMPOSIO_API_KEY || process.argv.includes('--skip-live')) {
    console.log('ℹ️ Usando caché de insights actualizada.');
    return;
  }

  const refreshAll = process.argv.includes('--all');
  console.log('📡 Conectando en vivo con la API oficial de Instagram (Meta / Graph API)...');
  try {
    // 1. Fetch recent media items (without heavy caption to prevent response truncation)
    const mediaRes = await callComposio([
      {
        tool_slug: 'INSTAGRAM_GET_IG_USER_MEDIA',
        arguments: {
          ig_user_id: 'me',
          limit: 40,
          fields: 'id,shortcode,permalink,timestamp'
        }
      }
    ]);

    const mediaItems = mediaRes.data?.results?.[0]?.response?.data?.data || [];
    if (mediaItems.length === 0) {
      console.log('⚠️ No se obtuvieron publicaciones de Instagram.');
      return;
    }

    console.log(`✓ Obtenidas las ${mediaItems.length} publicaciones más recientes directamente de Instagram.`);

    // Load existing insights cache so we can also refresh historical high-performing reels (or all with --all)
    let existingInsights = [];
    if (fs.existsSync(insightsPath)) {
      try {
        existingInsights = JSON.parse(fs.readFileSync(insightsPath, 'utf-8'));
      } catch (e) {}
    }

    const mapByShortcode = new Map();
    for (const p of existingInsights) {
      if (p.shortcode) mapByShortcode.set(p.shortcode, p);
    }
    for (const m of mediaItems) {
      const existing = mapByShortcode.get(m.shortcode) || {};
      mapByShortcode.set(m.shortcode, {
        ...existing,
        id: m.id,
        shortcode: m.shortcode,
        permalink: m.permalink,
        timestamp: m.timestamp
      });
    }

    const mediaKitIds = new Set([
      '18100207481374373', // Marinero de Luces - Isabel Pantoja
      '18134491147575971', // Redemption Song - Bob Marley
      '18115445776815921', // Shine On You Crazy Diamond - Pink Floyd
      '17993850060033460', // La Gata Bajo la Lluvia - Rocío Dúrcal
      '18074503436711429', // All By Myself - Celine Dion
      '18235760449320917'  // Yesterday Once More - The Carpenters
    ]);

    const recentIds = new Set(mediaItems.map(m => m.id));
    const itemsToRefresh = Array.from(mapByShortcode.values()).filter(item => {
      if (!item.id) return false;
      if (refreshAll) return true;
      if (recentIds.has(item.id)) return true;
      if (mediaKitIds.has(item.id)) return true;
      if ((item.views || 0) >= 10000) return true;
      return false;
    });

    // 2. Fetch insights in safe batches of 5 to guarantee full data arrays
    const BATCH_SIZE = 5;
    const metricsById = new Map();

    for (let i = 0; i < itemsToRefresh.length; i += BATCH_SIZE) {
      const batch = itemsToRefresh.slice(i, i + BATCH_SIZE);
      const tools = batch.map(m => ({
        tool_slug: 'INSTAGRAM_GET_IG_MEDIA_INSIGHTS',
        arguments: {
          ig_media_id: m.id,
          metric: ['views', 'reach', 'likes', 'saved', 'shares', 'comments']
        }
      }));

      try {
        const insightsRes = await callComposio(tools);
        const results = insightsRes.data?.results || [];

        for (const r of results) {
          if (!r.response?.successful) continue;
          const metrics = r.response.data?.data || [];
          let id = '';
          let views = 0, reach = 0, likes = 0, saved = 0, shares = 0, comments = 0;
          for (const m of metrics) {
            id = m.id.split('/')[0];
            const val = m.values?.[0]?.value ?? m.total_value?.value ?? 0;
            if (m.name === 'views') views = val;
            if (m.name === 'reach') reach = val;
            if (m.name === 'likes') likes = val;
            if (m.name === 'saved') saved = val;
            if (m.name === 'shares') shares = val;
            if (m.name === 'comments') comments = val;
          }
          if (id) {
            metricsById.set(id, { views, reach, likes, saved, shares, comments });
          }
        }
        process.stdout.write(`\r  Métricas en vivo consultadas: ${Math.min(i + BATCH_SIZE, itemsToRefresh.length)} / ${itemsToRefresh.length}...`);
      } catch (e) {
        console.error(`\n  Error consultando lote ${i}-${i + BATCH_SIZE}:`, e.message);
      }
    }
    process.stdout.write('\n');

    // 3. Merge into insights cache
    let updatedLive = 0;
    for (const [shortcode, item] of mapByShortcode.entries()) {
      const met = metricsById.get(item.id);
      if (!met) continue;
      mapByShortcode.set(shortcode, {
        ...item,
        views: met.views,
        reach: met.reach,
        likes: met.likes,
        saved: met.saved,
        shares: met.shares,
        comments: met.comments
      });
      updatedLive++;
    }

    const merged = Array.from(mapByShortcode.values());
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    fs.writeFileSync(insightsPath, JSON.stringify(merged, null, 2), 'utf-8');
    console.log(`✓ Archivo de insights actualizado con ${updatedLive} reels en tiempo real desde la API.`);
  } catch (err) {
    console.warn(`⚠️ No se pudo consultar la API en vivo (${err.message}). Se usará la última caché guardada.`);
  }
}

function normalizeStr(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Synchronizes Instagram Reels views, reach, likes and latest reel status into Supabase.
 */
export async function syncInstagramMetrics() {
  console.log('=== SINCRONIZACIÓN DE MÉTRICAS DE INSTAGRAM (TIEMPO REAL) ===\n');

  const insightsPath = 'scripts/data/instagram_insights.json';

  // 1. Query live Instagram Graph API
  await refreshLiveInstagramInsights(insightsPath);

  if (!fs.existsSync(insightsPath)) {
    throw new Error(`No se encontró el archivo de insights en ${insightsPath}`);
  }

  const posts = JSON.parse(fs.readFileSync(insightsPath, 'utf-8'));
  console.log(`\nCargados ${posts.length} posts totales del archivo de insights.`);

  // Identify latest reel by timestamp
  const sortedByTime = [...posts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latestPost = sortedByTime[0];
  const latestShortcode = latestPost?.shortcode;
  console.log(`⚡ Reel más reciente en Instagram: ${latestShortcode} (${latestPost?.timestamp})`);

  const postsByShortcode = new Map();
  for (const p of posts) {
    if (p.shortcode) postsByShortcode.set(p.shortcode, p);
  }

  // Fetch all Supabase stories
  const res = await fetch(`${SUPABASE_URL}/rest/v1/published_news?select=id,title,production_plan&order=created_at.desc`, { headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error en Supabase: ${res.status} - ${errText}`);
  }
  const dbRows = await res.json();

  // Check which recent posts (top 30) are not yet linked in Supabase
  const linkedShortcodes = new Set();
  for (const row of dbRows) {
    const pp = row.production_plan || {};
    const igUrl = pp.instagram_reel_url || pp.instagram_url || '';
    const m = igUrl.match(/reel\/([A-Za-z0-9_-]+)/);
    if (m) linkedShortcodes.add(m[1]);
  }

  const unlinkedRecentPosts = sortedByTime.slice(0, 30).filter(p => p.id && !linkedShortcodes.has(p.shortcode));
  const captionByShortcode = new Map();
  const idToShortcode = new Map(unlinkedRecentPosts.map(p => [String(p.id), p.shortcode]));

  if (unlinkedRecentPosts.length > 0 && COMPOSIO_API_KEY) {
    console.log(`🔍 Buscando captions de ${unlinkedRecentPosts.length} reels recientes sin vincular en Supabase: ${unlinkedRecentPosts.map(p => p.shortcode).join(', ')}`);
    for (let i = 0; i < unlinkedRecentPosts.length; i += 5) {
      const batch = unlinkedRecentPosts.slice(i, i + 5);
      try {
        const capRes = await callComposio(batch.map(p => ({
          tool_slug: 'INSTAGRAM_GET_IG_MEDIA',
          arguments: {
            ig_media_id: p.id,
            fields: 'id,permalink,timestamp,caption'
          }
        })));
        for (const r of capRes.data?.results || []) {
          const d = r.response?.data;
          const sc = d?.shortcode || idToShortcode.get(String(d?.id)) || (d?.permalink?.match(/reel\/([A-Za-z0-9_-]+)/)?.[1]);
          if (sc && d?.caption) {
            captionByShortcode.set(sc, normalizeStr(d.caption));
          }
        }
      } catch (e) {
        console.warn('⚠️ No se pudieron obtener algunos captions para auto-vinculación:', e.message);
      }
    }
  }

  let updatedCount = 0;
  const topUpdated = [];
  const updatesToRun = [];

  for (const row of dbRows) {
    if (row.title === '__system_subscribers__') continue;
    const pp = row.production_plan || {};
    let igUrl = pp.instagram_reel_url || pp.instagram_url || '';

    // Auto-match unlinked Supabase row against unlinked recent Instagram reels by song/artist/title/articleSlug in caption
    if (!igUrl && captionByShortcode.size > 0) {
      const rawTitle = String(row.title || pp.title || '');
      const parts = rawTitle.split('|').map(s => s.trim());
      const storyTitle = normalizeStr(parts[0] || '');
      const songAndArtist = parts[1] || '';
      const [songPart, artistPart] = songAndArtist.split(' - ').map(s => normalizeStr(s || ''));
      const slugNorm = normalizeStr(pp.slug || '');
      const articleSlugNorm = normalizeStr(pp.articleSlug || '');
      const songField = normalizeStr(pp.song || '');
      const artistField = normalizeStr(pp.artist || '');
      const combinedMeta = `${storyTitle} ${slugNorm} ${articleSlugNorm} ${songField} ${artistField}`;

      for (const [sc, capNorm] of captionByShortcode.entries()) {
        const sMatch = (songPart && songPart.length >= 4 && capNorm.includes(songPart)) || (songField && songField.length >= 4 && capNorm.includes(songField));
        const aMatch = (artistPart && artistPart.length >= 4 && capNorm.includes(artistPart)) || (artistField && artistField.length >= 4 && capNorm.includes(artistField));
        const tMatch = storyTitle && storyTitle.length >= 8 && capNorm.includes(storyTitle);
        const penelopeMatch = sc === 'DeZEmV8RSRc' && (combinedMeta.includes('penelope') || combinedMeta.includes('anden'));
        const galvanMatch = sc === 'DeNb7k9A-BF' && (combinedMeta.includes('manolo galvan') || combinedMeta.includes('madre entera') || combinedMeta.includes('hoy no me levanto'));
        const supremesMatch = sc === 'Debi4zsAJxh' && (combinedMeta.includes('supremes') || combinedMeta.includes('stop in the name') || combinedMeta.includes('name of love'));
        const zeppelinMatch = sc === 'DeabzmlR_Sx' && (combinedMeta.includes('zeppelin') || combinedMeta.includes('bonham') || combinedMeta.includes('bonzo'));
        const sergioMatch = sc === 'DeeHsfCA3bZ' && (combinedMeta.includes('sergio denis') || combinedMeta.includes('despedida') || combinedMeta.includes('profecia'));
        const peralesMatch = sc === 'Dec4KgbRvke' && (combinedMeta.includes('perales') || combinedMeta.includes('velero') || combinedMeta.includes('ahogado'));
        if ((sMatch && aMatch) || (tMatch && (sMatch || aMatch)) || penelopeMatch || galvanMatch || supremesMatch || zeppelinMatch || sergioMatch || peralesMatch) {
          const postObj = postsByShortcode.get(sc);
          if (postObj) {
            igUrl = postObj.permalink;
            captionByShortcode.delete(sc);
            console.log(`🔗 Auto-vinculando reel ${sc} a "${row.title}": ${igUrl}`);
            break;
          }
        }
      }
    }

    let matchedPost = null;
    if (igUrl) {
      const match = igUrl.match(/reel\/([A-Za-z0-9_-]+)/);
      if (match) {
        matchedPost = postsByShortcode.get(match[1]);
      }
    }

    if (matchedPost) {
      const isLatest = matchedPost.shortcode === latestShortcode;
      const views = matchedPost.views || 0;
      const reach = matchedPost.reach || 0;
      const likes = matchedPost.likes || 0;
      const saved = matchedPost.saved || 0;
      const shares = matchedPost.shares || 0;
      const comments = matchedPost.comments || 0;
      const publishedAt = matchedPost.timestamp;

      const updatedPlan = {
        ...pp,
        instagram_reel_url: matchedPost.permalink,
        views,
        reach,
        ig_likes: likes,
        ig_saved: saved,
        ig_shares: shares,
        ig_published_at: publishedAt,
        is_latest_reel: isLatest
      };

      updatesToRun.push(async () => {
        try {
          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${row.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              production_plan: updatedPlan,
              ig_published: true
            })
          });

          if (patchRes.ok) {
            updatedCount++;
            if (views > 50000 || isLatest) {
              const fullTitle = (row.title || pp.title || '').trim();
              const extra = [pp.song, pp.artist].filter(Boolean).join(' — ');
              topUpdated.push({
                title: fullTitle.includes('|') || !extra ? fullTitle : `${fullTitle} (${extra})`,
                views,
                reach,
                isLatest,
                shortcode: matchedPost.shortcode
              });
            }
          }
        } catch (e) {
          console.error(`Error actualizando ${row.id}:`, e.message);
        }
      });
    }
  }

  // Execute in concurrent chunks of 10
  console.log(`\nSincronizando ${updatesToRun.length} historias con Supabase...`);
  const CHUNK_SIZE = 10;
  for (let i = 0; i < updatesToRun.length; i += CHUNK_SIZE) {
    const chunk = updatesToRun.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(fn => fn()));
    process.stdout.write(`\rProgreso: ${Math.min(i + CHUNK_SIZE, updatesToRun.length)} / ${updatesToRun.length} historias sincronizadas...`);
  }
  process.stdout.write('\n');

  console.log(`\n✓ Sincronización exitosa: ${updatedCount} filas actualizadas en Supabase.`);
  console.log('\nTop historias destacadas:');
  topUpdated.sort((a, b) => b.views - a.views).forEach(t => {
    const tag = t.isLatest ? ' [⚡ ÚLTIMO ESTRENO]' : '';
    console.log(`- ${t.title}: ${t.views.toLocaleString()} views (${t.reach.toLocaleString()} reach)${tag}`);
  });

  return { updatedCount, latestShortcode };
}

if (process.argv[1]?.endsWith('sync-instagram-metrics.mjs')) {
  syncInstagramMetrics().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
