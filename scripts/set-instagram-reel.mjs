import fs from 'node:fs';
import path from 'node:path';

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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const [,, slugOrId, reelUrl] = process.argv;

if (!slugOrId || !reelUrl) {
  console.log(`
Uso:
  npm run set:reel <slug-o-nombre> <url-del-reel>

Ejemplo:
  npm run set:reel madonna https://www.instagram.com/reel/C8xyz123/
`);
  process.exit(0);
}

async function run() {
  console.log(`🔍 Buscando historia: "${slugOrId}"...`);

  const cleanInput = slugOrId.toLowerCase().replace(/^historia-/, '').replace(/[^a-z0-9]/g, '');
  const now = new Date().toISOString();

  // 1. Check local catalog
  const catalogPath = path.resolve(process.cwd(), 'web/src/data/stories_catalog.json');
  let catalog = [];
  let foundInCatalog = false;
  let targetTitle = '';
  let targetSlug = '';

  if (fs.existsSync(catalogPath)) {
    try {
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      const idx = catalog.findIndex(c => {
        if (c.id === slugOrId || c.slug === slugOrId) return true;
        const cSlug = (c.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cTitle = (c.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return cSlug === cleanInput || cSlug.includes(cleanInput) || cleanInput.includes(cSlug) ||
               cTitle === cleanInput || cTitle.includes(cleanInput);
      });

      if (idx >= 0) {
        foundInCatalog = true;
        targetTitle = catalog[idx].title;
        targetSlug = catalog[idx].slug;

        catalog[idx].instagramUrl = reelUrl;
        catalog[idx].igPublishedAt = catalog[idx].igPublishedAt || now;
        catalog[idx].isLatestReel = true;

        // Clear isLatestReel on others
        for (let i = 0; i < catalog.length; i++) {
          if (i !== idx) catalog[i].isLatestReel = false;
        }

        fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
        console.log(`💾 Catálogo web/src/data/stories_catalog.json actualizado con el Reel.`);

        // Sync to Cloudflare R2
        try {
          const { updateCatalogWithStory } = await import('./update-catalog-story.mjs');
          await updateCatalogWithStory({
            story: { id: catalog[idx].id, slug: catalog[idx].slug, title: catalog[idx].title },
            instagramUrl: reelUrl
          });
          console.log(`☁️  Catálogo sincronizado exitosamente con Cloudflare R2.`);
        } catch (r2Err) {
          console.warn('Aviso sincronizando R2:', r2Err.message);
        }
      }
    } catch (catErr) {
      console.warn('Aviso leyendo catálogo local:', catErr.message);
    }
  }

  // 2. Best-effort sync to Supabase
  if (supabaseUrl && supabaseKey) {
    try {
      const headers = {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        'content-type': 'application/json'
      };

      const res = await fetch(`${supabaseUrl}/rest/v1/published_news?select=id,title,production_plan&order=created_at.desc&limit=100`, { headers });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          const match = rows.find(r => 
            r.id === slugOrId || 
            r.production_plan?.slug === slugOrId || 
            r.title?.toLowerCase().includes(slugOrId.toLowerCase()) ||
            (cleanInput && (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanInput)
          );

          if (match) {
            targetTitle = targetTitle || match.title;
            const updatedPlan = {
              ...(match.production_plan || {}),
              instagram_reel_url: reelUrl,
              ig_published_at: match.production_plan?.ig_published_at || now,
              is_latest_reel: true
            };

            await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${match.id}`, {
              method: 'PATCH',
              headers: { ...headers, prefer: 'return=representation' },
              body: JSON.stringify({
                production_plan: updatedPlan,
                ig_published: true
              })
            });
            console.log(`🎉 ¡Enlace de Instagram guardado exitosamente en Supabase!`);
          }
        }
      } else {
        console.warn(`⚠️ Supabase devolvió HTTP ${res.status}. (Continuando con catálogo R2/local sin interrupción).`);
      }
    } catch (sbErr) {
      console.warn(`⚠️ Error conectando a Supabase (no fatal):`, sbErr.message);
    }
  }

  if (foundInCatalog) {
    console.log(`\n✅ ¡Reel actualizado exitosamente para "${targetTitle}"!`);
    console.log(`   Reel URL: ${reelUrl}`);
    console.log(`   Slug: ${targetSlug}`);
  } else {
    console.error(`❌ No se encontró ninguna historia que coincida con "${slugOrId}" en el catálogo.`);
    process.exit(1);
  }
}

run().catch(console.error);
