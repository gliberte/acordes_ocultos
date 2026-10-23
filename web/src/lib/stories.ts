import { supabase } from './supabase';
import type { StoryItem, Scene } from './types';
import { getCategoryInfo } from './categories';
import { extractCleanSummary } from './markdown';
import chroniclesMap from '../data/chronicles.json';
import availableCoversList from '../data/available_covers.json';
import availableHeroesList from '../data/available_heroes.json';
import availablePromosMap from '../data/available_promos.json';
import storiesCatalogFallback from '../data/stories_catalog.json';
import fs from 'node:fs';
import path from 'node:path';

const availableCovers = new Set<string>(availableCoversList);
const availableHeroes = new Set<string>(availableHeroesList);

// In-memory cache for serverless runtimes to avoid redundant network egress
let cachedStories: { data: StoryItem[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export function clearStoriesCache(): void {
  cachedStories = null;
}

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
    summary: content ? extractCleanSummary(content) : undefined,
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
  // Return cached result if available and fresh (bypasses redundant computation)
  if (!options.includeHidden && cachedStories && (Date.now() - cachedStories.timestamp < CACHE_TTL_MS)) {
    return cachedStories.data;
  }

  let items: StoryItem[] = [];

  // Always prioritize live catalog from Cloudflare R2 with immediate fallback to precompiled catalog
  try {
    const { getFromR2 } = await import('./r2');
    const r2Data = await getFromR2<any[]>('catalog/stories_catalog.json');
    if (Array.isArray(r2Data) && r2Data.length > 0) {
      items = r2Data.map(item => {
        const copy = { ...item } as StoryItem;
        if (typeof copy.category === 'object' && copy.category !== null) {
          copy.category = (copy.category as any).id || (copy.category as any).topic || 'acordes-ocultos';
        }
        return copy;
      });
    }
  } catch (_) {
    // Fallback below
  }

  if (items.length === 0 && Array.isArray(storiesCatalogFallback) && storiesCatalogFallback.length > 0) {
    items = storiesCatalogFallback.map(item => {
      const copy = { ...item } as StoryItem;
      if (typeof copy.category === 'object' && copy.category !== null) {
        copy.category = (copy.category as any).id || (copy.category as any).topic || 'acordes-ocultos';
      }
      return copy;
    });
  }

  // If includeHidden is requested (e.g. from admin panel), optionally merge any unpublished rows from Supabase
  if (options.includeHidden) {
    const localArticles = loadLocalArticles();
    try {
      const { data, error } = await supabase
        .from('published_news')
        .select('id, title, status, image_url, video_url, created_at, production_plan')
        .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      // Filter stories that have a title and some media or production plan
      const filtered = data.filter(r => r.title && (r.image_url || r.video_url || r.production_plan));
      
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
          'el-amor-que-llegaba-sin-firma': 'cecilia-un-ramito-de-violetas-historia-en-los-acordes',
          'elamorquellegabasinfirma': 'cecilia-un-ramito-de-violetas-historia-en-los-acordes',
          'elsecretodelascensorlavenganzadesimongarfunkel': 'simon-and-garfunkel-the-boxer',
          'icantgetnosatisfaction': 'the-rolling-stones-satisfaction',
          'lacancionsinfin': 'limahl-never-ending-story',
          'lavozmasdulcelaluchamasamarga': 'the-carpenters-close-to-you',
          'lacancionquebonosalvodeldivorcio': 'u2-with-or-without-you',
          'laimprovisacionde30libras': 'pink-floyd-the-great-gig-in-the-sky',
          'laimprovisacionde30librasquecambiolahistoriadelrock': 'pink-floyd-the-great-gig-in-the-sky',
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
          'lareinaeternadelmariachi': 'rocio-durcal-amor-eterno-catedrales-de-leyenda',
          'elcometaindomable': 'janis-joplin-piece-of-my-heart-destellos-de-gloria',
          'delahumillacionalagloriaeterna': 'janis-joplin-piece-of-my-heart-destellos-de-gloria',
          'elprofetadescalzoquedesafioalamuerte': 'bob-marley-redemption-song-destellos-de-gloria',
          'lacanciondecunamastristedelmundo': 'minnie-riperton-lovin-you-acordes-ocultos',
          'elsecretodetimeinabottle': 'jim-croce-time-in-a-bottle-acordes-ocultos',
          'elmilagrodedoschicoshambrientos': 'jay-and-the-americans-this-magic-moment-acordes-ocultos',
          'elhombrequeaprendioacorrercontraelviento': 'bob-seger-against-the-wind',
          'lacancionnacidadelvientoencontra': 'bob-seger-against-the-wind',
          'lacancionnacidadelvientoencontratiktokcut': 'bob-seger-against-the-wind',
          'lamaquetaprohibida': 'celine-dion-my-heart-will-go-on',
          'elfusilocultoenlanieve': 'cat-stevens-father-and-son',
          'elhimnosolarnacidoenuncuartohelado': 'the-mamas-and-the-papas-california-dreamin-acordes-ocultos',
          'elllantoqueparalizoaunpais': 'isabel-pantoja-marinero-de-luces-acordes-ocultos',
          'elhimnoquejuraronnocantarjamas': 'acdc-its-a-long-way-to-the-top-acordes-ocultos',
          'elvalsnupcialquenacioenelpresidio': 'paloma-san-basilio-luna-de-miel-acordes-ocultos',
          'david-voy-a-colgar-la-llamada-telefonica-real-que-rompio-a-david-summers-y-creo-temblando-en-10-minutos': 'hombres-g-temblando-acordes-ocultos',
          'davidvoyacolgorlallamadatelefonicarealquerompioadavidsummersycreotemblandoen10minutos': 'hombres-g-temblando-acordes-ocultos',
          'temblando': 'hombres-g-temblando-acordes-ocultos',
          'hombres-g-temblando': 'hombres-g-temblando-acordes-ocultos',
          'voy-a-dormir-la-carta-que-alfonsina-echo-al-correo-antes-de-caminar-hacia-el-mar': 'mercedes-sosa-alfonsina-y-el-mar-acordes-ocultos',
          'voyadormirlacartaquealfonsinaechoalcorreoantesdecaminarhaciaelmar': 'mercedes-sosa-alfonsina-y-el-mar-acordes-ocultos',
          'alfonsina-y-el-mar': 'mercedes-sosa-alfonsina-y-el-mar-acordes-ocultos',
          'alfonsinayelmar': 'mercedes-sosa-alfonsina-y-el-mar-acordes-ocultos',
          'mercedes-sosa-alfonsina-y-el-mar': 'mercedes-sosa-alfonsina-y-el-mar-acordes-ocultos',
          'el-tema-machista-que-aretha-franklin-le-arrebato-a-otis-redding-para-salvar-su-propia-vida': 'aretha-franklin-respect-acordes-ocultos',
          'eltemamachistaquearethafranklinlearrebatoaotisreddingparasalvarsupropiavida': 'aretha-franklin-respect-acordes-ocultos',
          'aretha-franklin-respect': 'aretha-franklin-respect-acordes-ocultos',
          'arethafranklinrespect': 'aretha-franklin-respect-acordes-ocultos',
          'respect': 'aretha-franklin-respect-acordes-ocultos',
          'videokilledtheradiostar': 'buggles-video-killed-radio-star',
          'lacanciondeamormasterrorifica': 'everybreath',
          'lacanciondeamormasincomodadelosanos60': 'younggirl',
          'elhimnoquequeenrechazo': 'tiger',
          'elbocadilloqueinventoelfuzz': 'fuzz',
          'illbethereforyou': 'illbethere',
          'lamusicaquedirigioaunamusa': 'west',
          'elacordequesalvoaunclasico': 'tinman',
          'elsoulqueenamoroalacorona': 'the-three-degrees-when-will-i-see-you-again',
          'elhimnodeluzquenaciodeunabilleteraperdida': 'the-5th-dimension-aquarius-acordes-ocultos',
          'elhitqueodiabasupropiabanda': 'africa',
          'mininaveneno': 'veneno',
          'elhimnodepazqueconmovioenlaguerra': 'bette-midler-from-a-distance',
          'dreamweaver': 'dream',
          'elsecretodeadioschicodemibarrio': 'tormenta-adios-chico-de-mi-barrio-acordes-ocultos',
          'elhimnodelamorquetuvoquecruzareloceano': 'manolo-galvan-te-quise-te-quiero-y-te-querre-acordes-ocultos',
          'lavozquevencioalmiedo': 'mercedes-sosa-todo-cambia-catedrales-de-leyenda',
          'lallamadaquehizolloraraamerica': 'king-clave-mi-corazon-lloro-acordes-ocultos',
          'lacanciondelabandonomasinexplicabledelpop': 'kiki-dee-amoureuse-acordes-ocultos',
          'lavozincombustiblequedesafioaltiempo': 'raphael-ave-maria-catedrales-de-leyenda',
          'lavozdetrasdeunabandaquenoexistia': 'the-archies-sugar-sugar-acordes-ocultos',
          'lacancionmasdulcenacidadeunavenganza': 'the-archies-sugar-sugar-acordes-ocultos',
          'elhimnoquenaciodeunadespedida': 'the-hollies-he-aint-heavy-hes-my-brother-acordes-ocultos',
          'ninobravolavozeternaquedetuvoelasfalto': 'nino-bravo-un-beso-y-una-flor-destellos-de-gloria',
          'elcometaqueardioensupropiofuego': 'amy-winehouse-back-to-black-destellos-de-gloria',
          'lacancionprohibidaquedesafiolamoralde1975': 'manolo-galvan-hoy-no-me-levanto-acordes-ocultos',
          'elsecretotraslasgafasoscuras': 'fr-david-words-acordes-ocultos',
          'laconfesionquevencioalsilencio': 'fr-david-words-acordes-ocultos',
          'elnombrequesalvounavidacuarentaanosdespues': 'the-poppy-family-which-way-you-goin-billy-acordes-ocultos',
          'elhijoquenadieesperaba': 'miguel-angel-robles-viuda-a-los-20-anos-historia-en-los-acordes',
          'elenigmadelgatoazul': 'roberto-carlos-un-gato-en-la-oscuridad-acordes-ocultos',
          'laquiebraqueparioaqueen': 'queen-bohemian-rhapsody-forjados-en-el-barro',
          'elgigantequecantodesdelassombras': 'nelson-ned-dejame-si-estoy-llorando',
          'elcolosodeunmetro': 'nelson-ned-dejame-si-estoy-llorando',
          'elcolosodeunmetroqueconquistoelmundo': 'nelson-ned-dejame-si-estoy-llorando',
          'nelsonneddejamesiestoyllorando': 'nelson-ned-dejame-si-estoy-llorando',
          'lacanciondeamorquecreyeronunamaldicion': 'silvio-rodriguez-ojala-acordes-ocultos',
          'elexorcismoqueconfundieronconunamaldicion': 'silvio-rodriguez-ojala-acordes-ocultos',
          'silviorodriguezojalaacordesocultos': 'silvio-rodriguez-ojala-acordes-ocultos',
          'lacanterainagotable': 'silvio-rodriguez-catedrales-de-leyenda',
          'silviorodriguezcatedralesdeleyenda': 'silvio-rodriguez-catedrales-de-leyenda',
          'elcantoquetrascendiolaseras': 'silvio-rodriguez-catedrales-de-leyenda',
          'elanimaldegalaxiaquepudieronquebrar': 'silvio-rodriguez-el-elegido-acordes-ocultos',
          'elanimaldegalaxia': 'silvio-rodriguez-el-elegido-acordes-ocultos',
          'canciondelelegido': 'silvio-rodriguez-el-elegido-acordes-ocultos',
          'silviorodriguezelelegidoacordesocultos': 'silvio-rodriguez-el-elegido-acordes-ocultos',
          'elmantradesobriedadquesalvoalashijasdelrock': 'wilson-phillips-hold-on-acordes-ocultos',
          'elmantradesobriedad': 'wilson-phillips-hold-on-acordes-ocultos',
          'wilsonphillipsholdonacordesocultos': 'wilson-phillips-hold-on-acordes-ocultos',
          'wilsonphillipsholdon': 'wilson-phillips-hold-on-acordes-ocultos',
          'elriffqueconquistoelmundoydestruyounaamistad': 'europe-the-final-countdown-acordes-ocultos',
          'elriffqueconquistoelmundo': 'europe-the-final-countdown-acordes-ocultos',
          'thefinalcountdown': 'europe-the-final-countdown-acordes-ocultos',
          'europethefinalcountdownacordesocultos': 'europe-the-final-countdown-acordes-ocultos',
          'elpoemadeunninode14anosqueseconvirtioenleyenda': 'heroes-del-silencio-maldito-duende-acordes-ocultos',
          'elpoemadeunninode14anos': 'heroes-del-silencio-maldito-duende-acordes-ocultos',
          'malditoduende': 'heroes-del-silencio-maldito-duende-acordes-ocultos',
          'heroesdelsilenciomalditoduendeacordesocultos': 'heroes-del-silencio-maldito-duende-acordes-ocultos',
          'heroesdelsilenciomalditoduende': 'heroes-del-silencio-maldito-duende-acordes-ocultos',
          'lostreshijosdeobrerosquedesafiaronaundictadorconguitarrasdejuguete': 'los-prisioneros-el-baile-de-los-que-sobran-forjados-en-el-barro',
          'lostreshijosdeobrerosquedesafiaronaundictador': 'los-prisioneros-el-baile-de-los-que-sobran-forjados-en-el-barro',
          'elbailedelosquesobran': 'los-prisioneros-el-baile-de-los-que-sobran-forjados-en-el-barro',
          'losprisioneroselbailedelosquesobran': 'los-prisioneros-el-baile-de-los-que-sobran-forjados-en-el-barro',
          'losprisioneroselbailedelosquesobranforjadosenelbarro': 'los-prisioneros-el-baile-de-los-que-sobran-forjados-en-el-barro',
          'eldiscodeorodondesuscropiosmusicos': 'the-grass-roots-midnight-confessions-acordes-ocultos',
          'eldiscodeorodondesuscropiostocartenianprohibido': 'the-grass-roots-midnight-confessions-acordes-ocultos',
          'eldiscodeoro': 'the-grass-roots-midnight-confessions-acordes-ocultos',
          'midnightconfessions': 'the-grass-roots-midnight-confessions-acordes-ocultos',
          'thegrassrootsmidnightconfessions': 'the-grass-roots-midnight-confessions-acordes-ocultos',
          'thegrassrootsmidnightconfessionsacordesocultos': 'the-grass-roots-midnight-confessions-acordes-ocultos',
          'patrickamormio': 'isabel-paton-patrick-amor-mio-acordes-ocultos',
          'elorganoaccidental': 'bob-dylan-like-a-rolling-stone-acordes-ocultos',
          'thatsallright': 'elvis-presley-thats-all-right-acordes-ocultos',
          'zombie': 'the-cranberries-zombie-acordes-ocultos',
          'elsolodesaxodebakerstreet': 'gerry-rafferty-baker-street-acordes-ocultos',
          'elfracasoolvidadoqueconquistoelmundo': 'jeanette-porque-te-vas-acordes-ocultos',
          'jeanetteporquetevas': 'jeanette-porque-te-vas-acordes-ocultos',
          'jeanetteporquetevasacordesocultos': 'jeanette-porque-te-vas-acordes-ocultos',
          'lasuplicaqueparoungolpe': 'the-supremes-stop-in-the-name-of-love',
          'stopinthenameoflove': 'the-supremes-stop-in-the-name-of-love',
          'thesupremesstopinthenameoflove': 'the-supremes-stop-in-the-name-of-love',
          'lamujerqueesperotodasuvidaenelanden': 'joan-manuel-serrat-penelope-historia-en-los-acordes',
          'penelopeserrat': 'joan-manuel-serrat-penelope-historia-en-los-acordes',
          'joanmanuelserratpenelope': 'joan-manuel-serrat-penelope-historia-en-los-acordes',
          'joanmanuelserratpenelopehistoriaenlosacordes': 'joan-manuel-serrat-penelope-historia-en-los-acordes',
          'ladespedidamasbelladelamusica': 'jarabe-de-palo-eso-que-tu-me-das-acordes-ocultos',
          'eltestamentodeamormaspurodelamusica': 'jarabe-de-palo-eso-que-tu-me-das-acordes-ocultos',
          'esoquetumedas': 'jarabe-de-palo-eso-que-tu-me-das-acordes-ocultos',
          'paudonesesoquetumedas': 'jarabe-de-palo-eso-que-tu-me-das-acordes-ocultos',
          'jarabedepaloesoquetumedas': 'jarabe-de-palo-eso-que-tu-me-das-acordes-ocultos',
          'jarabedepaloesoquetumedasacordesocultos': 'jarabe-de-palo-eso-que-tu-me-das-acordes-ocultos',
          'elpactoquedisolvioalgigantedelrock': 'led-zeppelin-kashmir-acordes-ocultos',
          'ledzeppelinkashmir': 'led-zeppelin-kashmir-acordes-ocultos',
          'ledzeppelinkashmiracordesocultos': 'led-zeppelin-kashmir-acordes-ocultos',
          'elreylagartoyelfuegoeterno': 'the-doors-touch-me',
          'thedoorstouchme': 'the-doors-touch-me',
          'jimmorrisonhomenajedestellosdegloria': 'the-doors-touch-me',
          'lamuertedebonzo': 'led-zeppelin-kashmir-acordes-ocultos',
          'elpactodehonor': 'led-zeppelin-kashmir-acordes-ocultos',
          'elmitodelninoahogado': 'jose-luis-perales-un-velero-llamado-libertad-acordes-ocultos',
          'unvelerollamadolibertad': 'jose-luis-perales-un-velero-llamado-libertad-acordes-ocultos',
          'joseluisperalesunvelerollamadolibertad': 'jose-luis-perales-un-velero-llamado-libertad-acordes-ocultos',
          'joseluisperalesunvelerollamadolibertadacordesocultos': 'jose-luis-perales-un-velero-llamado-libertad-acordes-ocultos',
          'elmitodelninoahogadoyeldolorrealdejoseluisperales': 'jose-luis-perales-un-velero-llamado-libertad-acordes-ocultos',
          'pequenomarinero': 'jose-luis-perales-un-velero-llamado-libertad-acordes-ocultos',
          'tearsinheaven': 'eric-clapton-tears-in-heaven-acordes-ocultos',
          'ericclaptontearsinheaven': 'eric-clapton-tears-in-heaven-acordes-ocultos',
          'ericclaptontearsinheavenacordesocultos': 'eric-clapton-tears-in-heaven-acordes-ocultos',
          'eldueloqueconmovioalmundo': 'eric-clapton-tears-in-heaven-acordes-ocultos',
          'elacordequesalvoaunpadre': 'eric-clapton-tears-in-heaven-acordes-ocultos',
          'pieromiviejo': 'piero-mi-viejo-catedrales-de-leyenda',
          'pieromiviejocatedralesdeleyenda': 'piero-mi-viejo-catedrales-de-leyenda',
          'miviejo': 'piero-mi-viejo-catedrales-de-leyenda',
          'lavozeternaquelecantoanuestrospadres': 'piero-mi-viejo-catedrales-de-leyenda',
          'rociojurado': 'rocio-jurado-como-una-ola-catedrales-de-leyenda',
          'rociojuradocatedralesdeleyenda': 'rocio-jurado-como-una-ola-catedrales-de-leyenda',
          'comounaola': 'rocio-jurado-como-una-ola-catedrales-de-leyenda',
          'rociojuradocomounaola': 'rocio-jurado-como-una-ola-catedrales-de-leyenda',
          'lamasgrande': 'rocio-jurado-como-una-ola-catedrales-de-leyenda',
          'yesterdayoncemore': 'the-carpenters-yesterday-once-more-acordes-ocultos',
          'thecarpentersyesterdayoncemore': 'the-carpenters-yesterday-once-more-acordes-ocultos',
          'thecarpentersyesterdayoncemoreacordesocultos': 'the-carpenters-yesterday-once-more-acordes-ocultos',
          'elrefugioquellegodemasiadotarde': 'the-carpenters-yesterday-once-more-acordes-ocultos',
          'eldolorocultotraslanostalgia': 'the-carpenters-yesterday-once-more-acordes-ocultos',
          'beegees': 'bee-gees-how-can-you-mend-a-broken-heart-acordes-ocultos',
          'howcanyoumendabrokenheart': 'bee-gees-how-can-you-mend-a-broken-heart-acordes-ocultos',
          'beegeeshowcanyoumendabrokenheart': 'bee-gees-how-can-you-mend-a-broken-heart-acordes-ocultos',
          'elpactodesangredelosbeegees': 'bee-gees-how-can-you-mend-a-broken-heart-acordes-ocultos',
          'comopuedesremendaruncorazonroto': 'bee-gees-how-can-you-mend-a-broken-heart-acordes-ocultos',
          'elcolosodeunmetroqueconquistoelmundo': 'nelson-ned-dejame-si-estoy-llorando',
          'elcolosodeunmetro': 'nelson-ned-dejame-si-estoy-llorando',
          'dejamesiestoyllorando': 'nelson-ned-dejame-si-estoy-llorando',
          'nelsonneddejamesiestoyllorando': 'nelson-ned-dejame-si-estoy-llorando',
          'blacksabbath': 'black-sabbath-paranoid-forjados-en-el-barro',
          'paranoid': 'black-sabbath-paranoid-forjados-en-el-barro',
          'blacksabbathparanoid': 'black-sabbath-paranoid-forjados-en-el-barro',
          'elaceroquesangroenlaniebla': 'black-sabbath-paranoid-forjados-en-el-barro',
          'descalzasenelparaiso': 'the-supremes-love-child-acordes-ocultos',
          'lovechild': 'the-supremes-love-child-acordes-ocultos',
          'thesupremeslovechild': 'the-supremes-love-child-acordes-ocultos',
          'dianarosslovechild': 'the-supremes-love-child-acordes-ocultos',
          'thesupremeslovechildacordesocultos': 'the-supremes-love-child-acordes-ocultos',
          'lanoviaeternadeunpais': 'angelica-maria-a-donde-va-nuestro-amor-catedrales-de-leyenda',
          'angelicamaria': 'angelica-maria-a-donde-va-nuestro-amor-catedrales-de-leyenda',
          'adondevanuestroamor': 'angelica-maria-a-donde-va-nuestro-amor-catedrales-de-leyenda',
          'angelicamariaadondevanuestroamor': 'angelica-maria-a-donde-va-nuestro-amor-catedrales-de-leyenda',
          'lanoviademexico': 'angelica-maria-a-donde-va-nuestro-amor-catedrales-de-leyenda',
          'muchachaitalianavieneacasarse': 'angelica-maria-a-donde-va-nuestro-amor-catedrales-de-leyenda',
          'lamascaradediosenelcuadrilatero': 'mister-loco-religious-man-acordes-ocultos',
          'misterloco': 'mister-loco-religious-man-acordes-ocultos',
          'religiousman': 'mister-loco-religious-man-acordes-ocultos',
          'misterlocoreligiousman': 'mister-loco-religious-man-acordes-ocultos',
          'misterlocoreligiousmanacordesocultos': 'mister-loco-religious-man-acordes-ocultos',
          'fraytormenta': 'mister-loco-religious-man-acordes-ocultos',
          'ritchievalensylamoneda': 'ritchie-valens-la-bamba-destellos-de-gloria',
          'ritchievalens': 'ritchie-valens-la-bamba-destellos-de-gloria',
          'labamba': 'ritchie-valens-la-bamba-destellos-de-gloria',
          'eldiaquemuriolamusica': 'ritchie-valens-la-bamba-destellos-de-gloria',
          'elfindelmundodeskeeterdavis': 'skeeter-davis-the-end-of-the-world',
          'skeeterdavis': 'skeeter-davis-the-end-of-the-world',
          'theendoftheworld': 'skeeter-davis-the-end-of-the-world',
          'skeeterdavistheendoftheworld': 'skeeter-davis-the-end-of-the-world',
          'dondeelmarguardounamor': 'emilio-jose-nuestra-playa-historia-en-los-acordes',
          'emiliojose': 'emilio-jose-nuestra-playa-historia-en-los-acordes',
          'nuestraplaya': 'emilio-jose-nuestra-playa-historia-en-los-acordes',
          'emiliojosenuestraplaya': 'emilio-jose-nuestra-playa-historia-en-los-acordes',
          'emiliojosenuestraplayahistoriaenlosacordes': 'emilio-jose-nuestra-playa-historia-en-los-acordes',
          'dancingqueen': 'abba-dancing-queen',
          'abba': 'abba-dancing-queen',
          'abbadancingqueen': 'abba-dancing-queen',
          'elacordemasfamosodelahistoria': 'the-beatles-a-day-in-the-life',
          'adayinthelife': 'the-beatles-a-day-in-the-life',
          'thebeatlesadayinthelife': 'the-beatles-a-day-in-the-life',
          'beatlesadayinthelife': 'the-beatles-a-day-in-the-life',
          'lavozfantasmadeltrajeblanco': 'the-rubettes-sugar-baby-love-acordes-ocultos',
          'therubettes': 'the-rubettes-sugar-baby-love-acordes-ocultos',
          'sugarbabylove': 'the-rubettes-sugar-baby-love-acordes-ocultos',
          'laultimavisitadeldiamanteloco': 'pink-floyd-shine-on-you-crazy-diamond',
          'shineonyoucrazydiamond': 'pink-floyd-shine-on-you-crazy-diamond',
          'pinkfloydshineonyoucrazydiamond': 'pink-floyd-shine-on-you-crazy-diamond',
          'eldiamantequevolviodelfrio': 'pink-floyd-shine-on-you-crazy-diamond',
          'sydbarrett': 'pink-floyd-shine-on-you-crazy-diamond',
          'pauldavinci': 'the-rubettes-sugar-baby-love-acordes-ocultos',
          'therubettessugarbabylove': 'the-rubettes-sugar-baby-love-acordes-ocultos',
          'therubettessugarbabyloveacordesocultos': 'the-rubettes-sugar-baby-love-acordes-ocultos',
          'elviajetridimensional': 'led-zeppelin-whole-lotta-love',
          'wholelottalove': 'led-zeppelin-whole-lotta-love',
          'ledzeppelinwholelottalove': 'led-zeppelin-whole-lotta-love',
          'tinydancer': 'elton-john-tiny-dancer',
          'eltonjohntinydancer': 'elton-john-tiny-dancer',
          'lacostureradelabanda': 'elton-john-tiny-dancer',
          'browneyedgirl': 'van-morrison-brown-eyed-girl',
          'vanmorrisonbrowneyedgirl': 'van-morrison-brown-eyed-girl',
          'elhombrequefingioserotro': 'the-rubettes-baby-i-know-historia-en-los-acordes',
          'babyiknow': 'the-rubettes-baby-i-know-historia-en-los-acordes',
          'therubettesbabyiknow': 'the-rubettes-baby-i-know-historia-en-los-acordes',
          'therubettesbabyiknowhistoriaenlosacordes': 'the-rubettes-baby-i-know-historia-en-los-acordes',
          'laprofeciadeunadespedida': 'sergio-denis-te-llamo-para-despedirme-acordes-ocultos',
          'sergiodenis': 'sergio-denis-te-llamo-para-despedirme-acordes-ocultos',
          'tellamoparadespedirme': 'sergio-denis-te-llamo-para-despedirme-acordes-ocultos',
          'sergiodenistellamoparadespedirme': 'sergio-denis-te-llamo-para-despedirme-acordes-ocultos',
          'sergiodenistellamoparadespedirmeacordesocultos': 'sergio-denis-te-llamo-para-despedirme-acordes-ocultos',
          'elhimnoalegredeunmoribundo': 'terry-jacks-seasons-in-the-sun-acordes-ocultos',
          'terryjacks': 'terry-jacks-seasons-in-the-sun-acordes-ocultos',
          'seasonsinthesun': 'terry-jacks-seasons-in-the-sun-acordes-ocultos',
          'terryjacksseasonsinthesun': 'terry-jacks-seasons-in-the-sun-acordes-ocultos',
          'terryjacksseasonsinthesunacordesocultos': 'terry-jacks-seasons-in-the-sun-acordes-ocultos',
          'elpactorotodeunacuna': 'pablo-milanes-yolanda-acordes-ocultos',
          'pablomilanes': 'pablo-milanes-yolanda-acordes-ocultos',
          'yolanda': 'pablo-milanes-yolanda-acordes-ocultos',
          'pablomilanesyolanda': 'pablo-milanes-yolanda-acordes-ocultos',
          'pablomilanesyolandaacordesocultos': 'pablo-milanes-yolanda-acordes-ocultos',
          'elecodelninoquenoqueriaserdios': 'kurt-cobain-the-man-who-sold-the-world-destellos-de-gloria',
          'kurtcobain': 'kurt-cobain-the-man-who-sold-the-world-destellos-de-gloria',
          'themanwhosoldtheworld': 'kurt-cobain-the-man-who-sold-the-world-destellos-de-gloria',
          'kurtcobainthemanwhosoldtheworld': 'kurt-cobain-the-man-who-sold-the-world-destellos-de-gloria',
          'kurtcobainthemanwhosoldtheworlddestellosdegloria': 'kurt-cobain-the-man-who-sold-the-world-destellos-de-gloria',
          'laapuestasuicidadelainvasionmarciana': 'jeff-wayne-the-war-of-the-worlds-acordes-ocultos',
          'jeffwayne': 'jeff-wayne-the-war-of-the-worlds-acordes-ocultos',
          'thewaroftheworlds': 'jeff-wayne-the-war-of-the-worlds-acordes-ocultos',
          'theeveofthewar': 'jeff-wayne-the-war-of-the-worlds-acordes-ocultos',
          'jeffwaynethewaroftheworlds': 'jeff-wayne-the-war-of-the-worlds-acordes-ocultos',
          'jeffwaynethewaroftheworldsacordesocultos': 'jeff-wayne-the-war-of-the-worlds-acordes-ocultos',
          'elgigantedeaceroquedesafioalasestrellas': 'jeff-wayne-thunder-child-historia-en-los-acordes',
          'thunderchild': 'jeff-wayne-thunder-child-historia-en-los-acordes',
          'jeffwaynethunderchild': 'jeff-wayne-thunder-child-historia-en-los-acordes',
          'jeffwaynethunderchildhistoriaenlosacordes': 'jeff-wayne-thunder-child-historia-en-los-acordes',
          'elhimnoqueaprendioalevantarnosdelosescombros': 'soda-stereo-cuando-pase-el-temblor',
          'el-himno-que-aprendio-a-levantarnos-de-los-escombros': 'soda-stereo-cuando-pase-el-temblor',
          'cuandopaseeltemblor': 'soda-stereo-cuando-pase-el-temblor',
          'sodastereocuandopaseeltemblor': 'soda-stereo-cuando-pase-el-temblor',
          'ladisculpaquetardo80anosellegrar': 'don-mclean-vincent-acordes-ocultos',
          'ladisculpaquetardo80anosenllegar': 'don-mclean-vincent-acordes-ocultos',
          'la-disculpa-que-tardo-80-anos-en-llegar': 'don-mclean-vincent-acordes-ocultos',
          'vincent': 'don-mclean-vincent-acordes-ocultos',
          'starrystarrynight': 'don-mclean-vincent-acordes-ocultos',
          'donmcleanvincent': 'don-mclean-vincent-acordes-ocultos',
          'donmcleanvincentacordesocultos': 'don-mclean-vincent-acordes-ocultos',
          'elmilagroacusticoenlaclinicasuiza': 'the-rolling-stones-angie-acordes-ocultos',
          'el-milagro-acustico-en-la-clinica-suiza': 'the-rolling-stones-angie-acordes-ocultos',
          'angie': 'the-rolling-stones-angie-acordes-ocultos',
          'therollingstonesangie': 'the-rolling-stones-angie-acordes-ocultos',
          'therollingstonesangieacordesocultos': 'the-rolling-stones-angie-acordes-ocultos',
          'rollingstonesangie': 'the-rolling-stones-angie-acordes-ocultos',
          'lapreguntaquehizotemblarauncorazon': 'jose-luis-perales-dime-historia-en-los-acordes',
          'la-pregunta-que-hizo-temblar-a-un-corazon': 'jose-luis-perales-dime-historia-en-los-acordes',
          'dime': 'jose-luis-perales-dime-historia-en-los-acordes',
          'joseluisperalesdime': 'jose-luis-perales-dime-historia-en-los-acordes',
          'joseluisperalesdimehistoriaenlosacordes': 'jose-luis-perales-dime-historia-en-los-acordes',
          'elexitoquedestruyoalabanda': 'berlin-take-my-breath-away-acordes-ocultos',
          'el-exito-que-destruyo-a-la-banda': 'berlin-take-my-breath-away-acordes-ocultos',
          'takemybreathaway': 'berlin-take-my-breath-away-acordes-ocultos',
          'berlintakemybreathaway': 'berlin-take-my-breath-away-acordes-ocultos',
          'berlin-take-my-breath-away': 'berlin-take-my-breath-away-acordes-ocultos',
          'laverdaderahistoriatrasenelmuelledesanblas': 'mana-en-el-muelle-de-san-blas-acordes-ocultos',
          'la-verdadera-historia-tras-en-el-muelle-de-san-blas': 'mana-en-el-muelle-de-san-blas-acordes-ocultos',
          'enelmuelledesanblas': 'mana-en-el-muelle-de-san-blas-acordes-ocultos',
          'en-el-muelle-de-san-blas': 'mana-en-el-muelle-de-san-blas-acordes-ocultos',
          'manaenelmuelledesanblas': 'mana-en-el-muelle-de-san-blas-acordes-ocultos',
          'manaenelmuelledesanblasacordesocultos': 'mana-en-el-muelle-de-san-blas-acordes-ocultos',
          'elpactodelascenizas': 'bee-gees-how-can-you-mend-a-broken-heart-acordes-ocultos',
          'song2': 'blur-song-2',
          'blursong2': 'blur-song-2',
          'elsabotajedelosdosminutos': 'blur-song-2',
          'riversofbabylon': 'boney-m-rivers-of-babylon',
          'boneymriversofbabylon': 'boney-m-rivers-of-babylon',
          'ellamentodelosesclavos': 'boney-m-rivers-of-babylon',
          'eljardininfinitodelnuevosol': 'nino-bravo-america-america-historia-en-los-acordes',
          'el-jardin-infinito-del-nuevo-sol': 'nino-bravo-america-america-historia-en-los-acordes',
          'ninobravoamericaamerica': 'nino-bravo-america-america-historia-en-los-acordes',
          'ninobravoamericaamericahistoriaenlosacordes': 'nino-bravo-america-america-historia-en-los-acordes',
          'americaamerica': 'nino-bravo-america-america-historia-en-los-acordes',
          'lacancioninacabadaquehizolloraraglencampbell': 'glen-campbell-wichita-lineman-acordes-ocultos',
          'la-cancion-inacabada-que-hizo-llorar-a-glen-campbell': 'glen-campbell-wichita-lineman-acordes-ocultos',
          'wichitalineman': 'glen-campbell-wichita-lineman-acordes-ocultos',
          'glencampbellwichitalineman': 'glen-campbell-wichita-lineman-acordes-ocultos',
          'glencampbellwichitalinemanacordesocultos': 'glen-campbell-wichita-lineman-acordes-ocultos',
          'lascuatropalabrasdeunpadrequeinmortalizaronajourney': 'journey-dont-stop-believin-acordes-ocultos',
          'las-cuatro-palabras-de-un-padre-que-inmortalizaron-a-journey': 'journey-dont-stop-believin-acordes-ocultos',
          'dontstopbelievin': 'journey-dont-stop-believin-acordes-ocultos',
          'dontstopbelieving': 'journey-dont-stop-believin-acordes-ocultos',
          'journeydontstopbelievin': 'journey-dont-stop-believin-acordes-ocultos',
          'journeydontstopbelievinacordesocultos': 'journey-dont-stop-believin-acordes-ocultos',
          'elsecretoagridulceocultodetrasdelasonrisadedaydreambeliever': 'the-monkees-daydream-believer-acordes-ocultos',
          'el-secreto-agridulce-oculto-detras-de-la-sonrisa-de-daydream-believer': 'the-monkees-daydream-believer-acordes-ocultos',
          'daydreambeliever': 'the-monkees-daydream-believer-acordes-ocultos',
          'themonkeesdaydreambeliever': 'the-monkees-daydream-believer-acordes-ocultos',
          'themonkeesdaydreambelieveracordesocultos': 'the-monkees-daydream-believer-acordes-ocultos',
          'bemybabyelhimnodeamoradolescentequecostolalibertadasupropiavoz': 'the-ronettes-be-my-baby-acordes-ocultos',
          'bemybabyelhimnodeamoradolescentequelecostolalibertadasupropiavoz': 'the-ronettes-be-my-baby-acordes-ocultos',
          'be-my-baby-el-himno-de-amor-adolescente-que-le-costo-la-libertad-a-su-propia-voz': 'the-ronettes-be-my-baby-acordes-ocultos',
          'bemybaby': 'the-ronettes-be-my-baby-acordes-ocultos',
          'theronettesbemybaby': 'the-ronettes-be-my-baby-acordes-ocultos',
          'theronettesbemybabyacordesocultos': 'the-ronettes-be-my-baby-acordes-ocultos',
          'elsecretodetrasdecrimsonandcloverdospalabrasaldespertarlamafiayunacintarobada': 'tommy-james-crimson-and-clover-acordes-ocultos',
          'el-secreto-detras-de-crimson-and-clover-dos-palabras-al-despertar-la-mafia-y-una-cinta-robada': 'tommy-james-crimson-and-clover-acordes-ocultos',
          'crimsonandclover': 'tommy-james-crimson-and-clover-acordes-ocultos',
          'tommyjamescrimsonandclover': 'tommy-james-crimson-and-clover-acordes-ocultos',
          'tommyjamescrimsonandcloveracordesocultos': 'tommy-james-crimson-and-clover-acordes-ocultos',
          'manuelalejandrolafracturaalos16anosquefrustroalconcertistaydiovidaalgranautordelabaladaenespanol': 'manuel-alejandro-catedrales-de-leyenda',
          'manuel-alejandro-la-fractura-a-los-16-anos-que-frustro-al-concertista-y-dio-vida-al-gran-autor-de-la-balada-en-espanol': 'manuel-alejandro-catedrales-de-leyenda',
          'manuelalejandro': 'manuel-alejandro-catedrales-de-leyenda',
          'manuelalejandrocatedralesdeleyenda': 'manuel-alejandro-catedrales-de-leyenda',
          'deperderasumadrealos5anosaprovocarelmayorboicotmundialdelosanos80': 'madonna-like-a-prayer-acordes-ocultos',
          'de-perder-a-su-madre-a-los-5-anos-a-provocar-el-mayor-boicot-mundial-de-los-anos-80': 'madonna-like-a-prayer-acordes-ocultos',
          'likeaprayer': 'madonna-like-a-prayer-acordes-ocultos',
          'madonnalikeaprayer': 'madonna-like-a-prayer-acordes-ocultos',
          'madonnalikeaprayeracordesocultos': 'madonna-like-a-prayer-acordes-ocultos'
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
            item.summary = extractCleanSummary(item.content);
          }
        }

        // Ensure coverUrl always uses local WebP if available under any of the story's slugs or aliases
        if (!item.coverUrl.startsWith('/covers/')) {
          const altCoverSlug = [
            item.slug,
            item.articleSlug,
            row.production_plan?.article_slug,
            row.production_plan?.story?.slug,
            CHRONICLE_ALIASES[item.slug]
          ].find(s => s && availableCovers.has(s));
          if (altCoverSlug) {
            item.coverUrl = `/covers/${altCoverSlug}.webp`;
          }
        }

        const existingIdx = items.findIndex(it => it.id === item.id || it.slug === item.slug);
        if (existingIdx >= 0) {
          if (item.instagramUrl && !items[existingIdx].instagramUrl) {
            items[existingIdx].instagramUrl = item.instagramUrl;
          }
          if (item.content && (!items[existingIdx].content || items[existingIdx].content.length < 500)) {
            items[existingIdx].content = item.content;
          }
        } else {
          items.unshift(item);
        }
      }
    }
  } catch (err) {
    console.warn('Supabase fetch failed/restricted, relying on R2 catalog:', err);
  }
  }

  // If both R2 and fallback failed, use local generated stories
  if (items.length === 0) {
    items = loadLocalGeneratedStories();
  }

  // Hydrate content, articleSlug, summary and local WebP coverUrl for catalog items
  const localArticlesForCatalog = loadLocalArticles();
  for (const item of items) {
    const rawAny = item as any;
    if (!item.content && rawAny.articleMarkdown) {
      item.content = rawAny.articleMarkdown;
    }
    if (!item.tiktokVideoUrl && rawAny.videoTiktokUrl) {
      item.tiktokVideoUrl = rawAny.videoTiktokUrl;
    }
    const itemSlugClean = (item.slug || '').replace(/[^a-z0-9]/g, '');
    const itemSongClean = item.songTitle ? slugify(item.songTitle).replace(/[^a-z0-9]/g, '') : '';
    const itemArtistClean = item.artist ? slugify(item.artist).replace(/[^a-z0-9]/g, '') : '';

    const matchedKey =
      (item.articleSlug && localArticlesForCatalog[item.articleSlug] ? item.articleSlug : null) ||
      (localArticlesForCatalog[item.slug] ? item.slug : null) ||
      Object.keys(localArticlesForCatalog).find(k => {
        const kClean = k.replace(/[^a-z0-9]/g, '');
        if (kClean === itemSlugClean || kClean.includes(itemSlugClean) || itemSlugClean.includes(kClean)) {
          return true;
        }
        if (itemSongClean.length >= 4 && kClean.includes(itemSongClean)) {
          if (itemArtistClean.length < 3 || kClean.includes(itemArtistClean.slice(0, 5))) {
            return true;
          }
        }
        return false;
      });

    if (matchedKey && localArticlesForCatalog[matchedKey]) {
      item.articleSlug = matchedKey;
      if (!item.content || item.content.length < 1000) {
        item.content = localArticlesForCatalog[matchedKey];
      }
    }
    if (!item.summary && item.content) {
      item.summary = extractCleanSummary(item.content);
    }
    if (!item.coverUrl || !item.coverUrl.startsWith('/covers/')) {
      const altCover = [item.slug, item.articleSlug].find(s => s && availableCovers.has(s));
      if (altCover) {
        item.coverUrl = `/covers/${altCover}.webp`;
      }
    }
    const promoPoster =
      (item.articleSlug && (availablePromosMap as Record<string, string>)[item.articleSlug]) ||
      (item.slug && (availablePromosMap as Record<string, string>)[item.slug]) ||
      undefined;
    if (promoPoster) {
      item.promoPosterUrl = promoPoster;
    }
  }

  // Filter out hidden stories unless explicitly requested (e.g. from admin panel).
  // Public catalog strictly requires an associated Instagram Reel (zero spoilers, only officially released content)
  if (!options.includeHidden) {
    items = items.filter(item => !item.isHidden && Boolean(item.instagramUrl));
  }

  // Sort chronologically:
  // Stories with the newest publication date (igPublishedAt or publishedAt) appear first.
  // Ties broken by highest views count.
  items.sort((a, b) => {
    const timeA = new Date(a.igPublishedAt || a.publishedAt || 0).getTime() || 0;
    const timeB = new Date(b.igPublishedAt || b.publishedAt || 0).getTime() || 0;
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    const viewsA = typeof a.views === 'number' ? a.views : 0;
    const viewsB = typeof b.views === 'number' ? b.views : 0;
    return viewsB - viewsA;
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

  // Cache in-memory for serverless instances (prevents redundant network queries)
  if (!options.includeHidden && items.length > 0) {
    cachedStories = {
      data: items,
      timestamp: Date.now()
    };
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
