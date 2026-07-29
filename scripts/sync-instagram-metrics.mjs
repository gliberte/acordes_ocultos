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

const headers = {
  apikey: SUPABASE_KEY,
  authorization: `Bearer ${SUPABASE_KEY}`,
  'content-type': 'application/json'
};

/**
 * Synchronizes Instagram Reels views, reach, likes and latest reel status into Supabase.
 */
export async function syncInstagramMetrics() {
  console.log('--- SINCRONIZANDO MÉTRICAS DE INSTAGRAM HACIA SUPABASE ---');

  const insightsPath = 'scripts/data/instagram_insights.json';
  if (!fs.existsSync(insightsPath)) {
    throw new Error(`No se encontró el archivo de insights en ${insightsPath}`);
  }

  const posts = JSON.parse(fs.readFileSync(insightsPath, 'utf-8'));
  console.log(`Cargados ${posts.length} posts con métricas.`);

  // Identify latest reel by timestamp
  const sortedByTime = [...posts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latestShortcode = sortedByTime[0]?.shortcode;
  console.log(`Reel más reciente en Instagram: ${latestShortcode} (${sortedByTime[0]?.timestamp})`);

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

  let updatedCount = 0;
  const topUpdated = [];

  for (const row of dbRows) {
    if (row.title === '__system_subscribers__') continue;
    const pp = row.production_plan || {};
    const igUrl = pp.instagram_reel_url || pp.instagram_url || '';

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
      const publishedAt = matchedPost.timestamp;

      const updatedPlan = {
        ...pp,
        views,
        reach,
        ig_likes: likes,
        ig_published_at: publishedAt,
        is_latest_reel: isLatest
      };

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
          topUpdated.push({
            title: (row.title || pp.title || '').split('|')[0].trim(),
            views,
            isLatest,
            shortcode: matchedPost.shortcode
          });
        }
      }
    }
  }

  console.log(`✓ Sincronización exitosa: ${updatedCount} filas actualizadas en Supabase.`);
  console.log('\nTop historias destacadas:');
  topUpdated.sort((a, b) => b.views - a.views).forEach(t => {
    const tag = t.isLatest ? ' [⚡ ÚLTIMO ESTRENO]' : '';
    console.log(`- ${t.title}: ${t.views.toLocaleString()} views${tag}`);
  });

  return { updatedCount, latestShortcode };
}

if (process.argv[1]?.endsWith('sync-instagram-metrics.mjs')) {
  syncInstagramMetrics().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
