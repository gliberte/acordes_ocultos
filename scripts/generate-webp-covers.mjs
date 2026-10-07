import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  '';

const coversDir = path.join(rootDir, 'web', 'public', 'covers');
const publicCoversDir = path.join(rootDir, 'public', 'covers');
const videosDir = path.join(rootDir, 'public', 'videos');
const articlesDir = path.join(rootDir, 'articles');
const tempDir = path.join(rootDir, '.temp_covers');

fs.mkdirSync(coversDir, { recursive: true });
fs.mkdirSync(publicCoversDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function findCwebp() {
  const candidates = ['/usr/local/bin/cwebp', '/opt/homebrew/bin/cwebp', 'cwebp'];
  for (const c of candidates) {
    try {
      execSync(`which ${c}`, { stdio: 'ignore' });
      return c;
    } catch (_) {}
  }
  return null;
}

const cwebpBin = findCwebp();
if (!cwebpBin) {
  console.error('❌ cwebp no está disponible en el sistema.');
  process.exit(1);
}

console.log('🚀 Iniciando optimización masiva de portadas a WebP (480x854 / 600px)...');

// 1. Fetch Supabase rows
console.log('📡 Consultando base de datos Supabase...');
const res = await fetch(`${supabaseUrl}/rest/v1/published_news?select=*&order=created_at.desc`, {
  headers: {
    apikey: supabaseKey,
    authorization: `Bearer ${supabaseKey}`
  }
});

if (!res.ok) {
  console.error(`❌ Error al consultar Supabase: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const rows = await res.json();
console.log(`📦 Registros obtenidos: ${rows.length}`);

// Map of local video folders for lookup
const localVideoFolders = fs.existsSync(videosDir) ? fs.readdirSync(videosDir) : [];
const localArticleFolders = fs.existsSync(articlesDir) ? fs.readdirSync(articlesDir) : [];

let convertedCount = 0;
let skippedCount = 0;
let downloadedCount = 0;
let failedCount = 0;

for (const row of rows) {
  const pp = row.production_plan || {};
  const title = row.title ? row.title.split('|')[0].trim() : '';
  let slug = pp.slug || (pp.story && pp.story.slug) || slugify(title);
  if (!slug) continue;

  const targetWebp = path.join(coversDir, `${slug}.webp`);
  const publicWebp = path.join(publicCoversDir, `${slug}.webp`);

  if (fs.existsSync(targetWebp) && fs.statSync(targetWebp).size > 1000) {
    skippedCount++;
    if (!fs.existsSync(publicWebp)) {
      fs.copyFileSync(targetWebp, publicWebp);
    }
    continue;
  }

  // Find source PNG
  let sourcePng = null;

  // 1. Check articles/<slug>/images/cover.png
  const artCover = path.join(articlesDir, slug, 'images', 'cover.png');
  if (fs.existsSync(artCover)) {
    sourcePng = artCover;
  }

  // 2. Check public/videos/<slug>/cover.png
  if (!sourcePng) {
    const vidCover = path.join(videosDir, slug, 'cover.png');
    if (fs.existsSync(vidCover)) {
      sourcePng = vidCover;
    }
  }

  // 3. Search local video folders by partial match
  if (!sourcePng) {
    const matchFolder = localVideoFolders.find(f => {
      const normF = slugify(f);
      return normF === slug || slug.includes(normF) || normF.includes(slug);
    });
    if (matchFolder) {
      const cand = path.join(videosDir, matchFolder, 'cover.png');
      if (fs.existsSync(cand)) {
        sourcePng = cand;
      }
    }
  }

  // 4. Search local article folders by partial match
  if (!sourcePng) {
    const matchArt = localArticleFolders.find(f => {
      const normF = slugify(f);
      return normF === slug || slug.includes(normF) || normF.includes(slug);
    });
    if (matchArt) {
      const cand = path.join(articlesDir, matchArt, 'images', 'cover.png');
      if (fs.existsSync(cand)) {
        sourcePng = cand;
      }
    }
  }

  // 5. Download from Cloudflare R2 if not found locally
  let tempDownloaded = false;
  if (!sourcePng) {
    const remoteUrl = row.image_url || pp.files?.cloudflare?.cover?.url || pp.files?.cloudflare?.cover;
    if (remoteUrl && typeof remoteUrl === 'string' && remoteUrl.startsWith('http')) {
      try {
        console.log(`⬇️ Descargando portada remota para [${slug}]...`);
        const imgRes = await fetch(remoteUrl);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const tempPath = path.join(tempDir, `${slug}.png`);
          fs.writeFileSync(tempPath, buffer);
          sourcePng = tempPath;
          tempDownloaded = true;
          downloadedCount++;
        }
      } catch (err) {
        console.warn(`⚠️ Error descargando ${remoteUrl}:`, err.message);
      }
    }
  }

  if (!sourcePng) {
    // No cover found
    continue;
  }

  // Convert to WebP 480x854 with cwebp
  try {
    execSync(`"${cwebpBin}" -q 80 -resize 480 854 "${sourcePng}" -o "${targetWebp}"`, { stdio: 'pipe' });
    fs.copyFileSync(targetWebp, publicWebp);
    const sz = (fs.statSync(targetWebp).size / 1024).toFixed(1);
    console.log(`✅ [${slug}] optimizado a WebP (${sz} KB)`);
    convertedCount++;
  } catch (err) {
    console.error(`❌ Error convirtiendo ${slug}:`, err.message);
    failedCount++;
  } finally {
    if (tempDownloaded && fs.existsSync(sourcePng)) {
      try { fs.unlinkSync(sourcePng); } catch (_) {}
    }
  }
}

// Clean up temp dir
try { fs.rmdirSync(tempDir, { recursive: true }); } catch (_) {}

// Write available_covers.json manifest
const allGeneratedCovers = fs.readdirSync(coversDir)
  .filter(f => f.endsWith('.webp'))
  .map(f => f.replace('.webp', ''));
const manifestPath = path.join(rootDir, 'web', 'src', 'data', 'available_covers.json');
fs.writeFileSync(manifestPath, JSON.stringify(allGeneratedCovers, null, 2));
console.log(`📋 Manifiesto actualizado: ${allGeneratedCovers.length} portadas en ${manifestPath}`);

console.log('\n----------------------------------------');
console.log(`✨ Resumen de optimización de portadas:`);
console.log(`   - Nuevas portadas WebP generadas: ${convertedCount}`);
console.log(`   - Portadas ya existentes (omitidas): ${skippedCount}`);
console.log(`   - Portadas descargadas de R2: ${downloadedCount}`);
console.log(`   - Fallidas: ${failedCount}`);
console.log('----------------------------------------\n');
