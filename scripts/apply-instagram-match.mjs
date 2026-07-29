import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const candidates = JSON.parse(fs.readFileSync('scripts/data/instagram_candidates.json', 'utf-8'));

/**
 * Applies confirmed matches by index array (e.g. [1, 2, 3, 4, 5])
 */
export async function applyMatches(indices) {
  const targetIndices = new Set(indices);
  const toApply = candidates.filter(c => targetIndices.has(c.index));

  console.log(`Aplicando ${toApply.length} coincidencias confirmadas a Supabase...`);

  const results = [];

  for (const item of toApply) {
    const slug = (item.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTitle = (item.title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');

    // Find all matching rows in Supabase for this story
    const { data: rows, error: searchErr } = await supabase
      .from('published_news')
      .select('id, title, production_plan')
      .order('created_at', { ascending: false });

    if (searchErr || !rows) {
      console.error(`Error buscando "${item.title}":`, searchErr);
      continue;
    }

    const matches = rows.filter(r => {
      if (r.id === item.id) return true;
      const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const rTitle = (r.title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
      if (slug && rSlug && (rSlug === slug || rSlug.includes(slug) || slug.includes(rSlug))) return true;
      if (cleanTitle && rTitle && (rTitle.includes(cleanTitle) || cleanTitle.includes(rTitle))) return true;
      return false;
    });

    if (matches.length === 0) {
      console.warn(`No se encontró registro para #${item.index} "${item.title}"`);
      continue;
    }

    for (const row of matches) {
      const currentPlan = row.production_plan || {};
      const updatedPlan = {
        ...currentPlan,
        instagram_reel_url: item.reel_url
      };

      const { error: updateErr } = await supabase
        .from('published_news')
        .update({
          production_plan: updatedPlan,
          ig_published: true
        })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`Error actualizando fila ${row.id}:`, updateErr);
      } else {
        results.push({
          index: item.index,
          title: item.title,
          artist: item.artist,
          reel_url: item.reel_url,
          row_id: row.id
        });
      }
    }
    console.log(`✓ #${item.index} "${item.title}" (${item.artist}) -> ${item.reel_url}`);
  }

  return results;
}

// CLI usage: node scripts/apply-instagram-match.mjs 1 2 3 4 5
if (process.argv[1]?.endsWith('apply-instagram-match.mjs')) {
  const args = process.argv.slice(2);
  const indices = args.map(a => parseInt(a, 10)).filter(n => !isNaN(n));
  if (indices.length === 0) {
    console.log('Uso: node scripts/apply-instagram-match.mjs <indices...>');
    process.exit(1);
  }
  applyMatches(indices).then(() => {
    console.log('Finalizado.');
    process.exit(0);
  });
}
