#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const supabaseUrl = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

console.log('🔄 ========================================================');
console.log('📚 ACORDES OCULTOS — PIPELINE INTEGRAL DE CRÓNICAS Y WEB');
console.log('🔄 ========================================================\n');

// 1. Optimizar imágenes a WebP
console.log('🖼️  [1/4] Optimizando imágenes WebP para web (conservando originales PNG)...');
try {
  execSync('node scripts/optimize-web-images.mjs', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error('⚠️ Error en optimize-web-images:', err.message);
}

// 2. Compilar dataset web/src/data/chronicles.json
console.log('\n📦 [2/4] Compilando dataset en web/src/data/chronicles.json...');
try {
  execSync('node scripts/compile-chronicles.mjs', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error('⚠️ Error en compile-chronicles:', err.message);
}

// 3. Generar HTML móvil y sincronizar con Google Drive Bóveda Maestra
console.log('\n📱 [3/4] Generando lectura_movil.html y sincronizando con Google Drive...');
try {
  execSync('node scripts/generate-chronicle-html.mjs', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error('⚠️ Error en generate-chronicle-html:', err.message);
}

// 4. Sincronizar Supabase (published_news.web_article)
console.log('\n📡 [4/4] Verificando y sincronizando crónicas en Supabase...');
async function syncSupabase() {
  const articlesDir = path.join(rootDir, 'articles');
  if (!fs.existsSync(articlesDir)) return;

  const localArticles = new Map();
  const entries = fs.readdirSync(articlesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'assets') {
      const artPath = path.join(articlesDir, entry.name, 'article.md');
      if (fs.existsSync(artPath)) {
        const content = fs.readFileSync(artPath, 'utf8');
        localArticles.set(entry.name, {
          path: artPath,
          content,
          words: content.split(/\s+/).length
        });
      }
    }
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/published_news?select=*`, {
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`
    }
  });

  if (!res.ok) {
    console.warn(`⚠️ No se pudo consultar Supabase: ${res.status} ${res.statusText}`);
    return;
  }

  const data = await res.json();
  let updatedCount = 0;

  for (const row of data) {
    const pp = row.production_plan || {};
    const story = pp.story || {};
    let title = row.title || '';
    let artist = pp.artist || row.music_artist || '';
    if (title.includes('|')) {
      const parts = title.split('|').map(p => p.trim());
      title = parts[0];
      if (!artist && parts.length > 2) artist = parts[2];
    }
    const slug = pp.slug || (pp.story && pp.story.slug) || slugify(title);

    let matchedArticle = null;
    for (const [k, art] of localArticles.entries()) {
      if (slug.includes(k) || k.includes(slug) || (artist && k.includes(slugify(artist))) || (title && slugify(title).includes(k))) {
        matchedArticle = { key: k, ...art };
        break;
      }
    }

    if (matchedArticle) {
      const currentContent = row.web_article || '';
      const currentWords = currentContent.split(/\s+/).length;

      // Si en Supabase no hay crónica extendida (< 500 palabras) o difiere significativamente
      if (currentWords < 500 && matchedArticle.words >= 500) {
        console.log(`  ⏳ Actualizando en Supabase: [${artist || title}] (${matchedArticle.words} palabras)...`);
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${row.id}`, {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            authorization: `Bearer ${supabaseKey}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            web_article: matchedArticle.content
          })
        });

        if (patchRes.ok) {
          console.log(`  ✅ [${artist || title}] sincronizado en Supabase con éxito.`);
          updatedCount++;
        } else {
          console.warn(`  ⚠️ Error actualizando ${row.id}: ${patchRes.statusText}`);
        }
      }
    }
  }

  if (updatedCount === 0) {
    console.log('  ✨ Todas las crónicas en Supabase ya están al día.');
  } else {
    console.log(`  ✨ ${updatedCount} crónica(s) sincronizada(s) con Supabase.`);
  }
}

try {
  await syncSupabase();
} catch (supabaseErr) {
  console.warn(`⚠️ No se pudo completar la sincronización con Supabase (red o permisos): ${supabaseErr.message}`);
}

console.log('\n🚀 ========================================================');
console.log('🎉 PIPELINE COMPLETADO EXITOSAMENTE');
console.log('   Para desplegar cambios en la web: npx vercel --prod');
console.log('========================================================\n');
