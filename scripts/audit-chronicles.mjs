import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function runAudit() {
  console.log('=== AUDITORÍA DE CRÓNICAS EXTENDIDAS EN ACORDES OCULTOS ===\n');

  const chroniclesPath = 'web/src/data/chronicles.json';
  const chroniclesMap = fs.existsSync(chroniclesPath) ? JSON.parse(fs.readFileSync(chroniclesPath, 'utf-8')) : {};
  const chronicleKeys = Object.keys(chroniclesMap);
  console.log(`Crónicas extendidas compiladas en el repositorio: ${chronicleKeys.length}`);

  const { data, error } = await supabase
    .from('published_news')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error al conectar con Supabase:', error);
    process.exit(1);
  }

  // Deduplicar como en getAllStories()
  const filtered = data.filter(r => r.title && (r.image_url || r.video_url || r.web_article));
  const itemsBySlug = new Map();

  for (const row of filtered) {
    const pp = row.production_plan || {};
    const story = pp.story || {};
    let title = row.title || 'Sin título';
    let artist = pp.artist || row.music_artist || '';
    if (title.includes('|')) {
      const parts = title.split('|').map(p => p.trim());
      title = parts[0];
      if (!artist && parts.length > 2) artist = parts[2];
    }
    let slug = pp.slug || (pp.story && pp.story.slug) || slugify(title);
    if (!slug) slug = `historia-${row.id}`;
    const igUrl = pp.instagram_reel_url || pp.instagram_url || row.instagram_url || '';
    const isHidden = row.status === 'hidden' || Boolean(pp.hidden) || Boolean(pp.is_hidden) || Boolean(story.hidden);

    const entry = {
      id: row.id,
      title,
      artist,
      songTitle: pp.music?.title || story.music?.title || '',
      category: pp.topic || story.topic || 'acordes-ocultos',
      slug,
      igUrl,
      isHidden,
      views: pp.views || 0,
      reach: pp.reach || 0,
      likes: pp.ig_likes || 0,
      web_article: row.web_article || '',
      caption: row.instagram_caption || pp.publication?.description || '',
      created_at: row.created_at,
      row
    };

    const existing = itemsBySlug.get(slug);
    if (!existing) {
      itemsBySlug.set(slug, entry);
    } else {
      if (!existing.igUrl && entry.igUrl) {
        itemsBySlug.set(slug, entry);
      }
    }
  }

  // Historias públicas en la web (con Instagram y no ocultas)
  const allStories = Array.from(itemsBySlug.values());
  const publicStories = allStories.filter(s => !s.isHidden && Boolean(s.igUrl));
  const unpublishedStories = allStories.filter(s => s.isHidden || !s.igUrl);

  console.log(`Total publicaciones públicas activas en la web: ${publicStories.length}`);
  console.log(`Publicaciones inéditas o pendientes de reel: ${unpublishedStories.length}\n`);

  const withFullChronicle = [];
  const withMediumText = [];
  const withShortCopyOnly = [];

  for (const s of publicStories) {
    const slugNorm = s.slug.replace(/[^a-z0-9]/g, '');
    const songNorm = slugify(s.songTitle).replace(/[^a-z0-9]/g, '');
    const titleNorm = slugify(s.title).replace(/[^a-z0-9]/g, '');
    const artistNorm = slugify(s.artist).replace(/[^a-z0-9]/g, '');

    // Strict matching with articles/:
    // Must match either the slug, or (artist AND songTitle), or an explicit chronicle key
    const matchingKey = chronicleKeys.find(k => {
      const kNorm = k.replace(/[^a-z0-9]/g, '');
      if (kNorm.includes(slugNorm) || slugNorm.includes(kNorm)) return true;
      if (songNorm.length > 3 && kNorm.includes(songNorm)) {
        if (artistNorm.length > 2 && kNorm.includes(artistNorm)) return true;
      }
      return false;
    });

    const localArticle = matchingKey ? chroniclesMap[matchingKey] : null;
    const dbArticle = s.web_article && s.web_article.trim().length > 0 ? s.web_article.trim() : null;

    // Determine the actual article used
    let activeText = '';
    let chronicleOrigin = 'Ninguno';

    if (localArticle && localArticle.length > 1000) {
      activeText = localArticle;
      chronicleOrigin = `Local Markdown: ${matchingKey}`;
    } else if (dbArticle && dbArticle.length > 1500) {
      activeText = dbArticle;
      chronicleOrigin = 'Supabase web_article (Largo)';
    } else if (dbArticle) {
      activeText = dbArticle;
      chronicleOrigin = 'Supabase web_article (Breve)';
    } else if (s.caption) {
      activeText = s.caption;
      chronicleOrigin = 'Instagram Caption';
    }

    const words = activeText ? activeText.trim().split(/\s+/).length : 0;
    const chars = activeText ? activeText.length : 0;
    const hasHeadings = activeText ? /#{1,4}\s+[A-Z0-9¿¡]/.test(activeText) : false;

    const itemReport = {
      ...s,
      words,
      chars,
      hasHeadings,
      chronicleOrigin,
      matchingKey: matchingKey || null
    };

    // Classify into tiers:
    // Tier 1: True extended chronicle (> 1,000 words or > 5,000 chars with structure)
    // Tier 2: Medium length article (350 - 999 words)
    // Tier 3: Short copy only / No chronicle (< 350 words, typical IG caption/anecdote)
    if (words >= 1000 || (words >= 800 && hasHeadings)) {
      withFullChronicle.push(itemReport);
    } else if (words >= 350) {
      withMediumText.push(itemReport);
    } else {
      withShortCopyOnly.push(itemReport);
    }
  }

  // Ordenar por visualizaciones descendente
  withFullChronicle.sort((a, b) => (b.views || 0) - (a.views || 0));
  withMediumText.sort((a, b) => (b.views || 0) - (a.views || 0));
  withShortCopyOnly.sort((a, b) => (b.views || 0) - (a.views || 0));

  console.log('================================================================');
  console.log(`RESUMEN GLOBAL DE LA AUDITORÍA (${publicStories.length} publicaciones activas):`);
  console.log(`1. 🏆 Con Crónica Extendida Completa (> 1.000 palabras / Substack): ${withFullChronicle.length} (${((withFullChronicle.length / publicStories.length) * 100).toFixed(1)}%)`);
  console.log(`2. 📖 Con Reseña / Texto Mediano (350 a 999 palabras):            ${withMediumText.length} (${((withMediumText.length / publicStories.length) * 100).toFixed(1)}%)`);
  console.log(`3. ❌ SIN Crónica Extendida (Solo copy corto < 350 palabras):     ${withShortCopyOnly.length} (${((withShortCopyOnly.length / publicStories.length) * 100).toFixed(1)}%)`);
  console.log('================================================================\n');

  console.log('--- 1. TOP PUBLICACIONES CON CRÓNICA EXTENDIDA COMPLETA ---');
  withFullChronicle.slice(0, 15).forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.views ? s.views.toLocaleString() + ' vistas' : 'Sin views'}] ${s.artist ? s.artist + ' - ' : ''}"${s.title}" (${s.words} palabras) | ${s.chronicleOrigin}`);
  });
  if (withFullChronicle.length > 15) {
    console.log(`   ... y ${withFullChronicle.length - 15} publicaciones más con crónica completa.`);
  }

  console.log('\n--- 2. PUBLICACIONES CON TEXTO MEDIANO (350-999 palabras) ---');
  withMediumText.forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.views ? s.views.toLocaleString() + ' vistas' : 'Sin views'}] ${s.artist ? s.artist + ' - ' : ''}"${s.title}" (${s.words} palabras) | ${s.chronicleOrigin} | Slug: ${s.slug}`);
  });

  console.log('\n--- 3. PUBLICACIONES SIN CRÓNICA EXTENDIDA (SOLO COPY CORTO < 350 palabras) ---');
  withShortCopyOnly.forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.views ? s.views.toLocaleString() + ' vistas' : 'Sin views'}] ${s.artist ? s.artist + ' - ' : ''}"${s.title}" (${s.words} palabras) | Slug: ${s.slug} | IG: ${s.igUrl}`);
  });

  // Guardar reporte JSON
  fs.writeFileSync('scripts/data/audit_chronicles_result.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPublicStories: publicStories.length,
    summary: {
      withFullChronicle: withFullChronicle.length,
      withMediumText: withMediumText.length,
      withShortCopyOnly: withShortCopyOnly.length
    },
    withFullChronicle: withFullChronicle.map(s => ({
      title: s.title,
      artist: s.artist,
      songTitle: s.songTitle,
      slug: s.slug,
      views: s.views,
      words: s.words,
      origin: s.chronicleOrigin
    })),
    withMediumText: withMediumText.map(s => ({
      title: s.title,
      artist: s.artist,
      songTitle: s.songTitle,
      slug: s.slug,
      views: s.views,
      words: s.words,
      origin: s.chronicleOrigin
    })),
    withShortCopyOnly: withShortCopyOnly.map(s => ({
      title: s.title,
      artist: s.artist,
      songTitle: s.songTitle,
      slug: s.slug,
      views: s.views,
      words: s.words,
      igUrl: s.igUrl
    }))
  }, null, 2));

  console.log('\n✓ Reporte detallado guardado en scripts/data/audit_chronicles_result.json');
}

runAudit();
