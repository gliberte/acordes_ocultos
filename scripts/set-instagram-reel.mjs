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

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env');
  process.exit(1);
}

const [,, slugOrId, reelUrl] = process.argv;

if (!slugOrId || !reelUrl) {
  console.log(`
Uso:
  npm run set:reel <slug-o-nombre> <url-del-reel>

Ejemplo:
  npm run set:reel lacarabquevencioathebeatles https://www.instagram.com/reel/C8xyz123/
`);
  process.exit(0);
}

async function run() {
  console.log(`🔍 Buscando historia: "${slugOrId}" en Supabase...`);

  const headers = {
    apikey: supabaseKey,
    authorization: `Bearer ${supabaseKey}`,
    'content-type': 'application/json'
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/published_news?select=id,title,production_plan&order=created_at.desc&limit=100`, { headers });
  const rows = await res.json();

  if (!Array.isArray(rows)) {
    console.error('Error al consultar Supabase:', rows);
    process.exit(1);
  }

  const match = rows.find(r => 
    r.id === slugOrId || 
    r.production_plan?.slug === slugOrId || 
    r.title?.toLowerCase().includes(slugOrId.toLowerCase())
  );

  if (!match) {
    console.error(`❌ No se encontró ninguna historia que coincida con "${slugOrId}".`);
    console.log('Últimas 5 historias disponibles:');
    rows.slice(0, 5).forEach(r => console.log(` - [${r.production_plan?.slug || r.id}] ${r.title}`));
    process.exit(1);
  }

  console.log(`✅ Historia encontrada: "${match.title}" (ID: ${match.id})`);

  const now = new Date().toISOString();
  const updatedPlan = {
    ...(match.production_plan || {}),
    instagram_reel_url: reelUrl,
    ig_published_at: match.production_plan?.ig_published_at || now,
    is_latest_reel: true
  };

  // Clear is_latest_reel on any other stories so only this one has it in DB
  try {
    const oldLatestRes = await fetch(`${supabaseUrl}/rest/v1/published_news?production_plan->>is_latest_reel=eq.true&select=id,production_plan`, { headers });
    if (oldLatestRes.ok) {
      const oldRows = await oldLatestRes.json();
      for (const oldRow of oldRows) {
        if (oldRow.id !== match.id) {
          const cleanedPlan = { ...(oldRow.production_plan || {}), is_latest_reel: false };
          await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${oldRow.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ production_plan: cleanedPlan })
          });
        }
      }
    }
  } catch (e) {
    // Non-fatal if clearing previous flag fails
  }

  const patchRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${match.id}`, {
    method: 'PATCH',
    headers: { ...headers, prefer: 'return=representation' },
    body: JSON.stringify({
      production_plan: updatedPlan,
      ig_published: true
    })
  });

  if (!patchRes.ok) {
    const err = await patchRes.text();
    console.error('Error actualizando Supabase:', err);
    process.exit(1);
  }

  console.log(`🎉 ¡Enlace de Instagram guardado exitosamente!`);
  console.log(`   Reel URL: ${reelUrl}`);
  console.log(`   Historia: ${match.title}`);
}

run().catch(console.error);
