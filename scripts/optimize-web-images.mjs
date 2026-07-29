import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const articlesDir = path.join(rootDir, 'articles');
const webArticlesDir = path.join(rootDir, 'web', 'articles');
const webPublicArticlesDir = path.join(rootDir, 'web', 'public', 'articles');

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
  console.error('❌ cwebp no está instalado o no se encuentra en el PATH.');
  process.exit(1);
}

console.log(`🖼️ Usando cwebp desde: ${cwebpBin}`);
console.log('🚀 Iniciando optimización de imágenes para web (preservando 100% originales)...\n');

let totalConverted = 0;
let totalSkipped = 0;
let originalBytes = 0;
let webpBytes = 0;

if (!fs.existsSync(articlesDir)) {
  console.error(`❌ Directorio no encontrado: ${articlesDir}`);
  process.exit(1);
}

const articleEntries = fs.readdirSync(articlesDir, { withFileTypes: true });

for (const entry of articleEntries) {
  if (!entry.isDirectory() || entry.name === 'assets') continue;

  const slug = entry.name;
  const imgDir = path.join(articlesDir, slug, 'images');
  if (!fs.existsSync(imgDir)) continue;

  const files = fs.readdirSync(imgDir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') continue;

    const baseName = path.basename(file, ext);
    const srcPng = path.join(imgDir, file);
    const targetWebp = path.join(imgDir, `${baseName}.webp`);

    const pngStat = fs.statSync(srcPng);
    originalBytes += pngStat.size;

    let needsConvert = true;
    if (fs.existsSync(targetWebp)) {
      const webpStat = fs.statSync(targetWebp);
      if (webpStat.mtimeMs >= pngStat.mtimeMs && webpStat.size > 0) {
        needsConvert = false;
        webpBytes += webpStat.size;
        totalSkipped++;
      }
    }

    if (needsConvert) {
      try {
        // Calidad 82: excelente retención de textura y grano de película con compresión ~90%
        execSync(`"${cwebpBin}" -q 82 "${srcPng}" -o "${targetWebp}"`, { stdio: 'ignore' });
        const webpStat = fs.statSync(targetWebp);
        webpBytes += webpStat.size;
        totalConverted++;
      } catch (err) {
        console.error(`⚠️ Error convirtiendo ${srcPng}:`, err.message);
        continue;
      }
    }

    // Réplica a web/public/articles/<slug>/images (creando el directorio automáticamente si es un nuevo slug)
    const pubDestDir = path.join(webPublicArticlesDir, slug, 'images');
    if (!fs.existsSync(pubDestDir)) {
      fs.mkdirSync(pubDestDir, { recursive: true });
    }
    fs.copyFileSync(targetWebp, path.join(pubDestDir, `${baseName}.webp`));

    // Réplica opcional a web/articles/<slug>/images si la carpeta existiera
    const webDestDir = path.join(webArticlesDir, slug, 'images');
    if (fs.existsSync(webDestDir)) {
      fs.copyFileSync(targetWebp, path.join(webDestDir, `${baseName}.webp`));
    }

    // Réplica de seguridad a carpetas de alias de producción
    const ALIAS_SLUGS = {
      'camilo-sesto-jesucristo-superstar-acordes-ocultos': ['eldesafiodejesucristosuperstar'],
      'gustavo-cerati-corazon-delator-catedrales-de-leyenda': ['elarquitectodelsonidoeterno'],
      'marilyn-monroe-candle-in-the-wind': ['elmitoylasombrademarilyn'],
      'rocio-durcal-amor-eterno-catedrales-de-leyenda': ['lareinaeternadelmariachi']
    };
    if (ALIAS_SLUGS[slug]) {
      for (const aliasSlug of ALIAS_SLUGS[slug]) {
        const aliasDestDir = path.join(webPublicArticlesDir, aliasSlug, 'images');
        if (!fs.existsSync(aliasDestDir)) {
          fs.mkdirSync(aliasDestDir, { recursive: true });
        }
        fs.copyFileSync(targetWebp, path.join(aliasDestDir, `${baseName}.webp`));
      }
    }
  }
}

const savedBytes = originalBytes - webpBytes;
const reductionPercent = originalBytes > 0 ? ((savedBytes / originalBytes) * 100).toFixed(1) : 0;

console.log('----------------------------------------------------');
console.log(`✅ Proceso finalizado con éxito:`);
console.log(`   - Imágenes WebP generadas / actualizadas: ${totalConverted}`);
console.log(`   - Imágenes ya optimizadas (omitidas): ${totalSkipped}`);
console.log(`   - Peso de originales (intactos): ${(originalBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log(`   - Peso en WebP para web: ${(webpBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log(`   - Ahorro de transferencia en web: ${(savedBytes / (1024 * 1024)).toFixed(2)} MB (-${reductionPercent}%)`);
console.log('----------------------------------------------------');
