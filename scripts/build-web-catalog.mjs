import fs from 'fs';
import path from 'path';

import { execSync } from 'child_process';

let token = process.env.SUPABASE_ACCESS_TOKEN || '';
if (!token) {
  try {
    token = execSync('security find-generic-password -s "Supabase CLI" -w 2>/dev/null', { encoding: 'utf-8' }).trim();
  } catch (e) {}
}
const ref = process.env.SUPABASE_PROJECT_REF || 'dsyxiowlipttwjuhoqio';

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

async function buildWebCatalog() {
  console.log('Fetching all published news from DB via Management API...');
  const query = `
    SELECT 
      id,
      title,
      image_url,
      video_url,
      status,
      created_at,
      production_plan
    FROM published_news
    WHERE title != '__system_subscribers__'
    ORDER BY created_at DESC;
  `;

  const res = await fetch('https://api.supabase.com/v1/projects/' + ref + '/database/query', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  console.log(`Retrieved ${rows.length} rows from database.`);

  const availableCovers = new Set(
    JSON.parse(fs.readFileSync('web/src/data/available_covers.json', 'utf-8') || '[]')
  );

  const chroniclesMap = JSON.parse(
    fs.readFileSync('web/src/data/chronicles.json', 'utf-8') || '{}'
  );

  const filtered = rows.filter(r => r.title && (r.image_url || r.video_url || r.production_plan));

  const itemsBySlug = new Map();

  for (const row of filtered) {
    const pp = row.production_plan || {};
    const story = pp.story || {};
    const files = pp.files || {};
    const cloudflare = files.cloudflare || {};

    let title = row.title || 'Sin título';
    let artist = pp.artist || row.music_artist || '';
    if (title.includes('|')) {
      const parts = title.split('|').map(p => p.trim());
      title = parts[0];
      if (!artist && parts.length > 2) artist = parts[2];
    }

    let slug = pp.slug || (pp.story && pp.story.slug) || slugify(title);
    if (!slug) slug = `historia-${row.id}`;

    const categoryId = pp.topic || story.topic || 'acordes-ocultos';
    const category = getCategoryInfo(categoryId);

    let coverUrl =
      (availableCovers.has(slug) ? `/covers/${slug}.webp` : null) ||
      row.image_url ||
      cloudflare.cover ||
      (files.assets && files.assets.find(a => a.type === 'cover')?.url) ||
      '/assets/substack_header_banner.jpg';

    const videoUrl =
      row.video_url ||
      cloudflare.video ||
      (files.assets && files.assets.find(a => a.type === 'video')?.url);

    const teaserUrl =
      pp.story_teaser_url ||
      row.teaser_url ||
      cloudflare.story_teaser;

    const audioUrl =
      pp.music?.audio_path ||
      story.music?.audio_path ||
      cloudflare.audio;

    const instagramUrl =
      pp.instagram_reel_url ||
      pp.instagram_url ||
      row.instagram_url ||
      undefined;

    const item = {
      id: String(row.id),
      slug,
      title,
      artist,
      songTitle: pp.music?.title || story.music?.title || undefined,
      category: category.id,
      categoryLabel: category.name,
      hook: story.hook || undefined,
      anecdote: story.anecdote || undefined,
      content: pp.publication?.description || '',
      summary: story.anecdote ? story.anecdote.slice(0, 200) + '...' : undefined,
      coverUrl,
      heroImageUrl: pp.hero_image || cloudflare.hero_banner || undefined,
      teaserUrl,
      videoUrl,
      audioUrl,
      spotifyUrl: pp.music?.spotify_url || story.music?.spotify_url || undefined,
      instagramUrl,
      hashtags: pp.hashtags || [],
      publishedAt: row.created_at || new Date().toISOString(),
      durationSeconds: pp.duration_seconds || 90,
      isHidden: row.status === 'hidden' || Boolean(pp.hidden) || Boolean(pp.is_hidden) || Boolean(story.hidden),
      views: typeof pp.views === 'number' ? pp.views : undefined,
      reach: typeof pp.reach === 'number' ? pp.reach : undefined,
      igLikes: typeof pp.ig_likes === 'number' ? pp.ig_likes : undefined,
      igPublishedAt: pp.ig_published_at || undefined,
      isLatestReel: Boolean(pp.is_latest_reel),
      source: 'catalog_build'
    };

    const existing = itemsBySlug.get(item.slug);
    if (!existing) {
      itemsBySlug.set(item.slug, item);
    } else {
      if (!existing.instagramUrl && item.instagramUrl) {
        itemsBySlug.set(item.slug, item);
      }
    }
  }

  const items = Array.from(itemsBySlug.values());

  // Link articles from chroniclesMap
  for (const item of items) {
    if (chroniclesMap[item.slug]) {
      item.articleSlug = item.slug;
      item.content = chroniclesMap[item.slug];
    } else {
      // Find matching key in chronicles
      const slugClean = item.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
      const k = Object.keys(chroniclesMap).find(key => key.toLowerCase().replace(/[^a-z0-9]/g, '').includes(slugClean.slice(0, 15)));
      if (k) {
        item.articleSlug = k;
        item.content = chroniclesMap[k];
      }
    }
  }

  // Identify latest reel
  let newestStory = null;
  let newestTime = -Infinity;
  for (const item of items) {
    if (item.instagramUrl) {
      const time = new Date(item.igPublishedAt || item.publishedAt).getTime();
      if (time > newestTime) {
        newestTime = time;
        newestStory = item;
      }
    }
  }

  for (const item of items) {
    item.isLatestReel = Boolean(newestStory && item.id === newestStory.id);
  }

  const outputPath = 'web/src/data/stories_catalog.json';
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`✓ Catalog exported successfully: ${items.length} stories saved to ${outputPath}`);
  console.log(`Latest reel: ${newestStory?.title} (${newestStory?.instagramUrl})`);
  console.log(`Stories with instagramUrl: ${items.filter(i => i.instagramUrl).length}`);
}

buildWebCatalog().catch(console.error);
