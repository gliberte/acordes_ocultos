import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const rootDir = process.cwd();

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

  // Unset isLatest on existing stories if this new one is marked latest
  const nowIso = new Date().toISOString();
  for (const item of catalog) {
    item.isLatest = false;
  }

  const newEntry = {
    id: story.id || slug,
    slug,
    title,
    songTitle,
    artist,
    summary: story.anecdote || editorialPackage.copy?.slice(0, 200) || '',
    topic,
    category,
    views: views || 0,
    reach: reach || 0,
    likes: likes || 0,
    coverUrl,
    videoUrl,
    videoTiktokUrl,
    teaserUrl,
    heroImageUrl,
    instagramUrl: instagramUrl || null,
    isLatest: true,
    publishedAt: nowIso,
    igPublishedAt: nowIso,
    articleSlug: matchedArticleSlug || story.articleSlug || null,
    articleMarkdown: resolvedWebArticle || null,
    durationSeconds: editorialPackage.durationSeconds || story.durationSeconds || 90,
    source: 'catalog'
  };

  // Check if already in catalog by slug
  const existingIdx = catalog.findIndex(item => item.slug === slug || item.id === newEntry.id);
  if (existingIdx >= 0) {
    catalog[existingIdx] = { ...catalog[existingIdx], ...newEntry };
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
