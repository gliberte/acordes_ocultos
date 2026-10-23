import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const articlesDir = path.join(rootDir, 'articles');
const webPublicDir = path.join(rootDir, 'web/public');
const webPublicArticlesDir = path.join(webPublicDir, 'articles');
const webPublicCoversDir = path.join(webPublicDir, 'covers');

const chroniclesMap = JSON.parse(fs.readFileSync(path.join(rootDir, 'web/src/data/chronicles.json'), 'utf8'));
const storiesCatalog = JSON.parse(fs.readFileSync(path.join(rootDir, 'web/src/data/stories_catalog.json'), 'utf8'));

console.log('🔍 INICIANDO AUDITORÍA COMPLETA DE CONTENIDO E IMÁGENES...');
console.log('========================================================\n');

// 1. Auditar las historias del catálogo web (historias publicadas y visibles)
const catalogIssues = [];

for (const story of storiesCatalog) {
  const slug = story.slug;
  const articleSlug = story.articleSlug || slug;
  const issues = [];

  // Verificar Portada / Cover
  if (story.coverUrl) {
    if (story.coverUrl.startsWith('/')) {
      const localCoverPath = path.join(webPublicDir, story.coverUrl);
      if (!fs.existsSync(localCoverPath)) {
        issues.push({ type: 'MISSING_COVER', ref: story.coverUrl, expectedPath: localCoverPath });
      }
    }
  } else {
    issues.push({ type: 'NO_COVER_URL' });
  }

  // Verificar Hero Image
  if (story.heroImageUrl && story.heroImageUrl.startsWith('/')) {
    const localHeroPath = path.join(webPublicDir, story.heroImageUrl);
    if (!fs.existsSync(localHeroPath)) {
      issues.push({ type: 'MISSING_HERO', ref: story.heroImageUrl, expectedPath: localHeroPath });
    }
  }

  // Verificar Contenido Markdown / Crónica
  const content = story.content || chroniclesMap[articleSlug] || chroniclesMap[slug] || '';
  if (content) {
    const imgMatches = [...content.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
    for (const match of imgMatches) {
      const alt = match[1];
      const rawSrc = match[2].trim();

      // Caso A: ruta relativa tipo images/xxx.png o ./images/xxx.png
      if (rawSrc.includes('images/')) {
        const fileName = path.basename(rawSrc);
        const baseName = fileName.replace(/\.[^.]+$/, '');
        
        // La web en markdown.ts busca: /articles/${safeSlug}/images/${baseName}.webp
        const expectedWebp = path.join(webPublicArticlesDir, articleSlug, 'images', `${baseName}.webp`);
        const fallbackArticleImg = path.join(articlesDir, articleSlug, 'images', fileName);
        const fallbackArticleWebp = path.join(articlesDir, articleSlug, 'images', `${baseName}.webp`);

        const webpExists = fs.existsSync(expectedWebp);
        const localSourceExists = fs.existsSync(fallbackArticleImg) || fs.existsSync(fallbackArticleWebp);

        if (!webpExists) {
          issues.push({
            type: 'BROKEN_INLINE_IMAGE',
            alt,
            rawSrc,
            expectedWebp: path.relative(rootDir, expectedWebp),
            localSourceExists,
            articleSlug
          });
        }
      } else if (rawSrc.startsWith('/')) {
        // Caso B: ruta absoluta en web/public
        const localPath = path.join(webPublicDir, rawSrc);
        if (!fs.existsSync(localPath)) {
          issues.push({
            type: 'BROKEN_ABSOLUTE_IMAGE',
            alt,
            rawSrc,
            expectedPath: path.relative(rootDir, localPath),
            articleSlug
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    catalogIssues.push({
      slug,
      articleSlug,
      title: story.title,
      publishedAt: story.publishedAt,
      issues
    });
  }
}

console.log(`📊 HISTORIAS EN CATÁLOGO CON PROBLEMAS: ${catalogIssues.length} de ${storiesCatalog.length}`);

// Mostrar primeros 20 problemas detallados
if (catalogIssues.length > 0) {
  console.log('\n🚨 DETALLE DE HISTORIAS CON IMÁGENES ROTAS O FALTANTES:');
  catalogIssues.forEach((item, idx) => {
    console.log(`\n------------------------------------------------------------`);
    console.log(`[${idx + 1}] SLUG: ${item.slug} (articleSlug: ${item.articleSlug})`);
    console.log(`    TÍTULO: ${item.title}`);
    console.log(`    FECHA: ${item.publishedAt || 'N/A'}`);
    console.log(`    PROBLEMAS DETECTADOS (${item.issues.length}):`);
    item.issues.forEach(iss => {
      if (iss.type === 'BROKEN_INLINE_IMAGE') {
        console.log(`      ❌ Imagen rota en crónica: ${iss.rawSrc}`);
        console.log(`         Buscada en web/public: ${iss.expectedWebp}`);
        console.log(`         ¿Existe archivo fuente en articles/? ${iss.localSourceExists ? 'SÍ (Falta compilar a web/public)' : 'NO (ARCHIVO NO EXISTE)'}`);
      } else if (iss.type === 'MISSING_COVER') {
        console.log(`      ❌ Portada faltante: ${iss.ref}`);
      } else if (iss.type === 'MISSING_HERO') {
        console.log(`      ❌ Hero image faltante: ${iss.ref}`);
      } else {
        console.log(`      ❌ ${iss.type}: ${JSON.stringify(iss)}`);
      }
    });
  });
}

// 2. Auditar todas las carpetas en ./articles para detectar discrepancias
console.log('\n\n========================================================');
console.log('🔍 AUDITANDO CARPETAS LOCALES EN ./articles...');
console.log('========================================================');

const articleDirs = fs.readdirSync(articlesDir).filter(f => fs.statSync(path.join(articlesDir, f)).isDirectory());
const localArticleIssues = [];

for (const aSlug of articleDirs) {
  const artPath = path.join(articlesDir, aSlug, 'article.md');
  if (!fs.existsSync(artPath)) continue;

  const content = fs.readFileSync(artPath, 'utf8');
  const imgMatches = [...content.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
  const missingInWeb = [];

  for (const match of imgMatches) {
    const rawSrc = match[2].trim();
    if (rawSrc.includes('images/')) {
      const fileName = path.basename(rawSrc);
      const baseName = fileName.replace(/\.[^.]+$/, '');
      const expectedWebp = path.join(webPublicArticlesDir, aSlug, 'images', `${baseName}.webp`);
      if (!fs.existsSync(expectedWebp)) {
        const sourceExists = fs.existsSync(path.join(articlesDir, aSlug, 'images', fileName));
        missingInWeb.push({
          rawSrc,
          baseName,
          sourceExists,
          expectedWebp: path.relative(rootDir, expectedWebp)
        });
      }
    }
  }

  if (missingInWeb.length > 0) {
    localArticleIssues.push({
      slug: aSlug,
      missingCount: missingInWeb.length,
      details: missingInWeb
    });
  }
}

console.log(`\n📁 Total carpetas en articles/: ${articleDirs.length}`);
console.log(`📁 Carpetas con imágenes no sincronizadas a web/public: ${localArticleIssues.length}`);

if (localArticleIssues.length > 0) {
  console.log('\nÚltimas carpetas con imágenes no sincronizadas (mostrando hasta 10):');
  localArticleIssues.slice(0, 10).forEach(item => {
    console.log(` - ${item.slug} (${item.missingCount} imágenes no encontradas en web/public)`);
    item.details.forEach(d => {
      console.log(`     * ${d.rawSrc} -> fuente local: ${d.sourceExists ? 'SÍ' : 'NO'}`);
    });
  });
}
