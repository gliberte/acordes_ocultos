import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const rootDir = process.cwd();

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(rootDir, '.env'));
loadEnvFile(path.join(rootDir, 'web', '.env'));

// Helper categories
const CATEGORIES = {
  'acordes-ocultos': { id: 'acordes-ocultos', name: 'Acordes Ocultos' },
  'historia-en-los-acordes': { id: 'historia-en-los-acordes', name: 'Historia en los Acordes' },
  'destellos-de-gloria': { id: 'destellos-de-gloria', name: 'Destellos de Gloria' },
  'forjados-en-el-barro': { id: 'forjados-en-el-barro', name: 'Forjados en el Barro' },
  'catedrales-de-leyenda': { id: 'catedrales-de-leyenda', name: 'Catedrales de Leyenda' }
};

function getCategoryInfo(topic) {
  return CATEGORIES[topic] || CATEGORIES['acordes-ocultos'];
}

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Uploads data buffer or string to Cloudflare R2
 */
async function uploadToR2(key, body, contentType = 'application/json') {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || 'nexo-gaming-news-videos';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('⚠️ [R2] Credenciales no configuradas para subir catálogo a R2.');
    return false;
  }

  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
    return true;
  } catch (err) {
    console.warn(`⚠️ [R2] Error al subir ${key}:`, err.message);
    return false;
  }
}

/**
 * Downloads data from Cloudflare R2 to merge latest live updates
 */
async function downloadFromR2(key) {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || 'nexo-gaming-news-videos';

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    });

    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    if (!res.Body) return null;
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

/**
 * Updates web/src/data/stories_catalog.json with a new or edited story,
 * and syncs the catalog to Cloudflare R2.
 */
export async function updateCatalogWithStory({
  story,
  editorialPackage = {},
  cloudflare = null,
  files = {},
  coverPath = null,
  teaserPath = null,
  heroBannerPath = null,
  matchedArticleSlug = null,
  resolvedWebArticle = null,
  instagramUrl = null,
  views = 0,
  reach = 0,
  likes = 0
}) {
  const catalogPath = path.join(rootDir, 'web', 'src', 'data', 'stories_catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.warn(`⚠️ No se encontró el catálogo en ${catalogPath}`);
    return null;
  }

  let catalog = [];
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch (e) {
    console.error(`Error leyendo catálogo: ${e.message}`);
    return null;
  }

  // Sincronizar y preservar campos en vivo desde Cloudflare R2 (instagramUrl, views, reach, likes, etc.)
  try {
    const r2Catalog = await downloadFromR2('catalog/stories_catalog.json');
    if (Array.isArray(r2Catalog)) {
      let r2Merged = 0;
      for (const r2Item of r2Catalog) {
        const localMatch = catalog.find(c => c.id === r2Item.id || c.slug === r2Item.slug || (c.articleSlug && c.articleSlug === r2Item.articleSlug));
        if (localMatch) {
          // Si en R2 hay un enlace de Instagram y difiere del local, R2 (Web Admin) tiene la máxima prioridad
          if (r2Item.instagramUrl && r2Item.instagramUrl !== localMatch.instagramUrl) {
            localMatch.instagramUrl = r2Item.instagramUrl;
            r2Merged++;
          }
          if (r2Item.igPublishedAt) localMatch.igPublishedAt = r2Item.igPublishedAt;
          if (typeof r2Item.isLatestReel === 'boolean') localMatch.isLatestReel = r2Item.isLatestReel;
          if (typeof r2Item.isHidden === 'boolean') localMatch.isHidden = r2Item.isHidden;
          if (r2Item.views && (!localMatch.views || r2Item.views > localMatch.views)) localMatch.views = r2Item.views;
          if (r2Item.reach && (!localMatch.reach || r2Item.reach > localMatch.reach)) localMatch.reach = r2Item.reach;
          if (r2Item.likes && (!localMatch.likes || r2Item.likes > localMatch.likes)) localMatch.likes = r2Item.likes;
        } else if (r2Item.slug) {
          // Si se creó una historia en el admin o en R2 que no está en el JSON local, conservarla
          catalog.push(r2Item);
          r2Merged++;
        }
      }
      if (r2Merged > 0) {
        console.log(`🔗 Preservados y combinados ${r2Merged} enlaces/métricas de Instagram desde Cloudflare R2.`);
      }
    }
  } catch (mergeErr) {
    console.warn(`Aviso combinando catálogo R2: ${mergeErr.message}`);
  }

  const rawTitle = editorialPackage.title || story.title || 'Sin título';
  let title = rawTitle;
  let artist = editorialPackage.artist || story.artist || '';
  if (title.includes('|')) {
    const parts = title.split('|').map(p => p.trim());
    title = parts[0];
    if (!artist && parts.length > 2) artist = parts[2];
  }

  const slug = story.slug || slugify(rawTitle);
  const songTitle = story.music?.title || '';
  const topic = story.topic || 'acordes-ocultos';
  const category = getCategoryInfo(topic);

  // Available covers check
  const availableCoversPath = path.join(rootDir, 'web', 'src', 'data', 'available_covers.json');
  const availableCovers = new Set(
    fs.existsSync(availableCoversPath) ? JSON.parse(fs.readFileSync(availableCoversPath, 'utf8') || '[]') : []
  );

  const cloudFiles = cloudflare?.enabled ? cloudflare.files : null;
  const coverUrl =
    (availableCovers.has(slug) ? `/covers/${slug}.webp` : null) ||
    cloudFiles?.cover_webp?.url ||
    cloudFiles?.cover?.url ||
    (fs.existsSync(path.join(rootDir, 'web', 'public', 'covers', `${slug}.webp`)) ? `/covers/${slug}.webp` : null) ||
    '/assets/substack_header_banner.jpg';

  const videoUrl = cloudFiles?.video?.url || null;
  const videoTiktokUrl = cloudFiles?.video_tiktok?.url || null;
  const teaserUrl = cloudFiles?.story_teaser?.url || null;
  const heroImageUrl = cloudFiles?.hero_banner?.url || null;

  const existingIdx = catalog.findIndex(item => item.slug === slug || item.id === (story.id || slug));
  const prev = existingIdx >= 0 ? catalog[existingIdx] : {};

  const nowIso = new Date().toISOString();
  const fullArticle = resolvedWebArticle || prev.content || prev.articleMarkdown || null;

  const hookStr = (typeof story.hook === 'string' ? story.hook : story.hook?.es) || (typeof prev.hook === 'string' ? prev.hook : prev.hook?.es) || undefined;
  const anecdoteStr = (typeof story.anecdote === 'string' ? story.anecdote : story.anecdote?.es) || editorialPackage.copy || (typeof prev.anecdote === 'string' ? prev.anecdote : prev.anecdote?.es) || undefined;

  const newEntry = {
    ...prev,
    id: prev.id || story.id || slug,
    slug,
    title,
    songTitle: songTitle || prev.songTitle || '',
    artist: artist || prev.artist || '',
    hook: hookStr,
    anecdote: anecdoteStr,
    content: fullArticle || '',
    summary: anecdoteStr || prev.summary || editorialPackage.copy?.slice(0, 200) || '',
    topic,
    category: category.id || topic,
    categoryLabel: category.name || 'Acordes Ocultos',
    views: views || prev.views || 0,
    reach: reach || prev.reach || 0,
    likes: likes || prev.likes || 0,
    coverUrl: coverUrl !== '/assets/substack_header_banner.jpg' ? coverUrl : (prev.coverUrl || coverUrl),
    videoUrl: videoUrl || prev.videoUrl || null,
    videoTiktokUrl: videoTiktokUrl || prev.videoTiktokUrl || prev.tiktokVideoUrl || null,
    tiktokVideoUrl: videoTiktokUrl || prev.tiktokVideoUrl || prev.videoTiktokUrl || null,
    teaserUrl: teaserUrl || prev.teaserUrl || null,
    heroImageUrl: heroImageUrl || prev.heroImageUrl || null,
    instagramUrl: instagramUrl || prev.instagramUrl || null,
    hashtags: editorialPackage.hashtags || story.hashtags || prev.hashtags || [],
    isLatest: prev.isLatest ?? false,
    publishedAt: prev.publishedAt || nowIso,
    igPublishedAt: prev.igPublishedAt || nowIso,
    articleSlug: matchedArticleSlug || story.articleSlug || prev.articleSlug || null,
    articleMarkdown: fullArticle,
    durationSeconds: editorialPackage.durationSeconds || story.durationSeconds || prev.durationSeconds || 90,
    source: prev.source || 'catalog'
  };

  if (existingIdx >= 0) {
    catalog[existingIdx] = newEntry;
    console.log(`📝 Actualizada historia existente en catálogo: "${title}" (${slug})`);
  } else {
    catalog.unshift(newEntry);
    console.log(`✨ Agregada nueva historia al inicio del catálogo: "${title}" (${slug})`);
  }

  // Write catalog to disk
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`💾 Catálogo local guardado: ${catalog.length} historias (${(fs.statSync(catalogPath).size / 1024).toFixed(1)} KB)`);

  // Sync to Cloudflare R2
  const catalogJsonStr = JSON.stringify(catalog);
  const r2Ok1 = await uploadToR2('catalog/stories_catalog.json', catalogJsonStr);
  const r2Ok2 = await uploadToR2('acordes-ocultos/catalog/stories_catalog.json', catalogJsonStr);
  if (r2Ok1 || r2Ok2) {
    console.log('☁️  Catálogo sincronizado exitosamente con Cloudflare R2.');
  }

  return newEntry;
}
