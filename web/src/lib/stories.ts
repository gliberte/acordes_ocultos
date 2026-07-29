import { supabase } from './supabase';
import type { StoryItem, Scene } from './types';
import { getCategoryInfo } from './categories';
import chroniclesMap from '../data/chronicles.json';
import availableCoversList from '../data/available_covers.json';
import availableHeroesList from '../data/available_heroes.json';
import fs from 'node:fs';
import path from 'node:path';

const availableCovers = new Set<string>(availableCoversList);
const availableHeroes = new Set<string>(availableHeroesList);

export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Normalizes a raw Supabase row into our standardized StoryItem
 */
function normalizeSupabaseRow(row: any): StoryItem {
  const pp = row.production_plan || {};
  const story = pp.story || {};
  const files = pp.files || {};
  const cloudflare = files.cloudflare || {};

  // Extract clean title & artist
  let title = row.title || 'Sin título';
  let artist = pp.artist || row.music_artist || '';
  
  // Clean up title if it contains pipes or branding
  if (title.includes('|')) {
    const parts = title.split('|').map((p: string) => p.trim());
    title = parts[0];
    if (!artist && parts.length > 2) {
      artist = parts[2];
    }
  }

  // Derive slug
  let slug = pp.slug || (pp.story && pp.story.slug) || slugify(title);
  if (!slug) slug = `historia-${row.id}`;

  const categoryId = pp.topic || story.topic || 'acordes-ocultos';
  const category = getCategoryInfo(categoryId);

  // Extract media URLs (prioritizing ultra-fast local WebP CDN covers)
  let coverUrl =
    (availableCovers.has(slug) ? `/covers/${slug}.webp` : null) ||
    row.image_url ||
    cloudflare.cover ||
    (files.assets && files.assets.find((a: any) => a.type === 'cover')?.url) ||
    '/assets/substack_header_banner.jpg';

  const videoUrl =
    row.video_url ||
    row.source_url ||
    cloudflare.video ||
    (files.assets && files.assets.find((a: any) => a.type === 'video')?.url);

  const tiktokVideoUrl =
    cloudflare.tiktok_video ||
    cloudflare.video_tiktok ||
    (files.assets && files.assets.find((a: any) => a.type === 'tiktok_video')?.url);

  const teaserUrl =
    pp.story_teaser_url ||
    row.teaser_url ||
    cloudflare.story_teaser;

  const audioUrl =
    pp.music?.audio_path ||
    story.music?.audio_path ||
    cloudflare.audio;

  // Extract content / text
  const content =
    row.web_article ||
    pp.publication?.description ||
    row.instagram_caption ||
    row.tiktok_script ||
    '';

  // Extract scenes
  let scenes: Scene[] = [];
  if (Array.isArray(story.scenes)) {
    scenes = story.scenes.map((s: any, idx: number) => ({
      number: s.scene_id || idx + 1,
      text: s.narrative_text || s.text || '',
      image: s.visual_resource?.image_url || s.image || undefined,
      duration: s.duration || (s.end_time_seconds ? s.end_time_seconds - s.start_time_seconds : undefined)
    }));
  } else if (Array.isArray(pp.scenes)) {
    scenes = pp.scenes.map((s: any, idx: number) => ({
      number: s.scene_id || idx + 1,
      text: s.narrative_text || '',
      image: s.visual_resource?.image_url || undefined,
      duration: s.end_time_seconds ? s.end_time_seconds - s.start_time_seconds : undefined
    }));
  }

  const heroImageUrl =
    (availableHeroes.has(slug) ? `/images/heroes/${slug}.webp` : null) ||
    pp.hero_image ||
    cloudflare.hero_banner ||
    (slug.includes('pantoja') || slug.includes('paralizo') ? '/images/hero-pantoja-featured.webp' : undefined);

  return {
    id: String(row.id),
    slug,
    title,
    artist,
    songTitle: pp.music?.title || story.music?.title || undefined,
    category: category.id,
    categoryLabel: category.name,
    hook: story.hook || undefined,
    anecdote: story.anecdote || undefined,
    content,
    summary: content ? content.slice(0, 220) + '...' : undefined,
    coverUrl,
    heroImageUrl,
    teaserUrl,
    videoUrl,
    tiktokVideoUrl,
    audioUrl,
    spotifyUrl: pp.music?.spotify_url || story.music?.spotify_url || undefined,
    instagramUrl: pp.instagram_reel_url || pp.instagram_url || row.instagram_url || undefined,
    hashtags: pp.hashtags || [],
    publishedAt: row.created_at || row.published_at || new Date().toISOString(),
    durationSeconds: pp.duration_seconds || 90,
    scenes: scenes.length > 0 ? scenes : undefined,
    extraImages: Array.isArray(pp.extra_images) ? pp.extra_images : undefined,
    isHidden: row.status === 'hidden' || Boolean(pp.hidden) || Boolean(pp.is_hidden) || Boolean(story.hidden),
    views: typeof pp.views === 'number' ? pp.views : undefined,
    reach: typeof pp.reach === 'number' ? pp.reach : undefined,
    igLikes: typeof pp.ig_likes === 'number' ? pp.ig_likes : undefined,
    igPublishedAt: pp.ig_published_at || undefined,
    isLatestReel: Boolean(pp.is_latest_reel),
    social: pp.social || undefined,
    source: 'supabase'
  };
}

/**
 * Loads rich markdown chronicles from compiled dataset
 */
function loadLocalArticles(): Record<string, string> {
  return chroniclesMap as Record<string, string>;
}

/**
 * Loads local fallback stories from `src/data/generated/`
 */
function loadLocalGeneratedStories(): StoryItem[] {
  const stories: StoryItem[] = [];
  try {
    const dataDir = path.resolve(process.cwd(), '../src/data/generated');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.endsWith('-tiktok.json'));
      for (const file of files) {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
          const slug = file.replace('.json', '');
          const cat = getCategoryInfo(raw.topic || raw.category);
          stories.push({
            id: `local-${slug}`,
            slug,
            title: raw.title || slug,
            artist: raw.artist || raw.music?.artist || '',
            songTitle: raw.music?.title || '',
            category: cat.id,
            categoryLabel: cat.name,
            hook: raw.hook,
            anecdote: raw.anecdote,
            content: raw.anecdote || raw.editorial_post || '',
            summary: raw.anecdote ? raw.anecdote.slice(0, 200) + '...' : '',
            coverUrl: availableCovers.has(slug) ? `/covers/${slug}.webp` : `/brand/acordes-ocultos-logo-sm.webp`,
            hashtags: raw.hashtags || [],
            publishedAt: new Date().toISOString(),
            durationSeconds: 90,
            scenes: raw.scenes || [],
            source: 'local'
          });
        } catch (e) {
          // ignore corrupted json
        }
      }
    }
  } catch (err) {
    console.warn('Could not read local generated data:', err);
  }
  return stories;
}

/**
 * Fetches all stories, prioritizing cloud Supabase data with local fallback.
 * By default filters out hidden stories unless includeHidden is true.
 */
export async function getAllStories(options: { includeHidden?: boolean } = {}): Promise<StoryItem[]> {
  const localArticles = loadLocalArticles();
  let items: StoryItem[] = [];

  try {
    const { data, error } = await supabase
      .from('published_news')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      // Filter stories that have a title and some media or content
      const filtered = data.filter(r => r.title && (r.image_url || r.video_url || r.web_article));
      
      // Deduplicate by slug, giving precedence to rows with instagramUrl and public status
      const itemsBySlug = new Map<string, { item: StoryItem; row: any }>();
      for (const row of filtered) {
        const item = normalizeSupabaseRow(row);
        const existing = itemsBySlug.get(item.slug);
        if (!existing) {
          itemsBySlug.set(item.slug, { item, row });
        } else {
          // If the existing entry doesn't have an instagramUrl but current one does, replace it!
          if (!existing.item.instagramUrl && item.instagramUrl) {
            itemsBySlug.set(item.slug, { item, row });
          }
        }
      }

      for (const { item, row } of itemsBySlug.values()) {
        // Explicit aliases for compiled chronicle keys matching special production slugs
        const CHRONICLE_ALIASES: Record<string, string> = {
          'elsecretodelascensorlavenganzadesimongarfunkel': 'simon-and-garfunkel-the-boxer',
          'icantgetnosatisfaction': 'the-rolling-stones-satisfaction',
          'lacancionsinfin': 'limahl-never-ending-story',
          'lavozmasdulcelaluchamasamarga': 'the-carpenters-close-to-you',
          'lacancionquebonosalvodeldivorcio': 'u2-with-or-without-you',
          'laimprovisacionde30libras': 'pink-floyd-the-great-gig-in-the-sky',
          'elhimnoprohibidoquehizotemblaraunregimen': 'pink-floyd-another-brick-in-the-wall-part-2',
          'gimmeshelter': 'the-rolling-stones-gimme-shelter',
          'elrescatedethesoundofsilence': 'simon-and-garfunkel-the-sound-of-silence',
          'elsabotajemusicalqueterminoenexitomundial': 'blur-song-2',
          'laconfesionmasoscuradelosanos80': 'phil-collins-in-the-air-tonight',
          'sanfrancisco': 'scott-mckenzie-san-francisco',
          'queenyelmilagrodelliveaid': 'queen-radio-ga-ga-live-aid-1985',
          'laverguenzaquecreounhimno': 'jose-maria-napoleon-vive',
          'elriffgrabadomientrasdormia': 'the-rolling-stones-satisfaction',
          'elhimnodiscoquenacioenelcautiverio': 'boney-m-rivers-of-babylon',
          'creep': 'radiohead-creep',
          'lacamisaqueguardoelultimoabrazo': 'the-irrepressibles-in-this-shirt',
          'elpactodesangredefleetwoodmac': 'fleetwood-mac-the-chain',
          'loveisblue': 'paul-mauriat-love-is-blue',
          'eldesafiodejesucristosuperstar': 'camilo-sesto-jesucristo-superstar-acordes-ocultos',
          'elarquitectodelsonidoeterno': 'gustavo-cerati-corazon-delator-catedrales-de-leyenda',
          'elmitoylasombrademarilyn': 'marilyn-monroe-candle-in-the-wind',
          'lareinaeternadelmariachi': 'rocio-durcal-amor-eterno-catedrales-de-leyenda'
        };

        const itemSlugClean = item.slug.replace(/[^a-z0-9]/g, '');
        const itemSongClean = item.songTitle ? slugify(item.songTitle).replace(/[^a-z0-9]/g, '') : '';
        const itemArtistClean = item.artist ? slugify(item.artist).replace(/[^a-z0-9]/g, '') : '';

        // Check if there is an extended markdown article locally matching this story
        const matchingArticleKey =
          CHRONICLE_ALIASES[item.slug] ||
          Object.keys(localArticles).find(k => {
            const kClean = k.replace(/[^a-z0-9]/g, '');
            // Exact or substring slug match
            if (kClean === itemSlugClean || kClean.includes(itemSlugClean) || itemSlugClean.includes(kClean)) {
              return true;
            }
            // Song title match + artist match (prevents cross-contamination of different songs by same artist)
            if (itemSongClean.length >= 4 && kClean.includes(itemSongClean)) {
              if (itemArtistClean.length < 3 || kClean.includes(itemArtistClean.slice(0, 5))) {
                return true;
              }
            }
            // Artist match + key words from slug
            if (itemArtistClean.length >= 4 && kClean.includes(itemArtistClean)) {
              const slugWords = item.slug.split(/[^a-z0-9]+/).filter(w => w.length >= 5);
              if (slugWords.length > 0 && slugWords.some(w => kClean.includes(w))) {
                return true;
              }
            }
            return false;
          });

        if (matchingArticleKey && localArticles[matchingArticleKey]) {
          item.articleSlug = matchingArticleKey;
          const isCustomEdited = Boolean(row.production_plan?.custom_article);
          if (!isCustomEdited || !item.content || item.content.length < 1000) {
            item.content = localArticles[matchingArticleKey];
          }
        }

        items.push(item);
      }
    }
  } catch (err) {
    console.warn('Supabase fetch failed, using local dataset fallback:', err);
  }

  // If Supabase returned nothing or failed, fallback to local stories
  if (items.length === 0) {
    items = loadLocalGeneratedStories();
  }

  // Filter out hidden stories unless explicitly requested (e.g. from admin panel)
  // Public catalog only displays stories that are already published on Instagram (zero spoilers, zero copyright risk)
  if (!options.includeHidden) {
    items = items.filter(item => !item.isHidden && Boolean(item.instagramUrl));
  }

  // Sort hierarchically:
  // 1. Stories with highest views first (descending).
  // 2. Stories with equal or without views sort by newest publication date (descending).
  items.sort((a, b) => {
    const viewsA = typeof a.views === 'number' ? a.views : -1;
    const viewsB = typeof b.views === 'number' ? b.views : -1;
    if (viewsB !== viewsA) {
      return viewsB - viewsA;
    }
    const dateA = new Date(a.igPublishedAt || a.publishedAt).getTime();
    const dateB = new Date(b.igPublishedAt || b.publishedAt).getTime();
    return dateB - dateA;
  });

  // Dynamically determine the latest Instagram Reel:
  // Find the story with the most recent publication timestamp (igPublishedAt or publishedAt)
  let newestStory: StoryItem | null = null;
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

  // Set isLatestReel = true ONLY for the dynamically detected newest story
  for (const item of items) {
    item.isLatestReel = Boolean(newestStory && item.id === newestStory.id);
  }

  return items;
}

export async function getStoryBySlug(slug: string, options: { includeHidden?: boolean } = {}): Promise<StoryItem | null> {
  const all = await getAllStories(options);
  const normalizedSlug = slugify(slug);
  return all.find(s => s.slug === slug || slugify(s.slug) === normalizedSlug || s.id === slug) || null;
}

export async function getFeaturedStory(): Promise<StoryItem | null> {
  const all = await getAllStories({ includeHidden: false });
  return all[0] || null;
}
