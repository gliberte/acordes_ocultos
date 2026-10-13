import fs from 'node:fs';
import path from 'node:path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || '';

const availableCoversList = JSON.parse(fs.readFileSync('web/src/data/available_covers.json', 'utf8'));
const availableCovers = new Set(availableCoversList);
const chroniclesMap = JSON.parse(fs.readFileSync('web/src/data/chronicles.json', 'utf8'));

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const CHRONICLE_ALIASES = {
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
  'elacordequesostuvoaunpadre': 'eric-clapton-tears-in-heaven-acordes-ocultos',
  'elacordequevencioalolvido': 'the-carpenters-yesterday-once-more-acordes-ocultos',
  'elhimnoduelodisfrazadodeexitopop': 'the-carpenters-yesterday-once-more-acordes-ocultos',
  'eldespertadorqueaterrorizoapinkfloyd': 'pink-floyd-time-acordes-ocultos',
  'laoraciondesgarradadewarrington': 'the-cranberries-zombie-acordes-ocultos',
  'elrelampagoquedespertoamemphis': 'elvis-presley-thats-all-right-acordes-ocultos',
  'elorganoaccidental': 'bob-dylan-like-a-rolling-stone-acordes-ocultos',
  'elnaufragioqueparalizolasplayas': 'isabel-paton-patrick-amor-mio-acordes-ocultos',
  'laquiebraqueparioaqueen': 'queen-bohemian-rhapsody-forjados-en-el-barro',
  'lamelancoliadoradadelasfalto': 'gerry-rafferty-baker-street-acordes-ocultos',
  'elsecretotraslasgafasoscuras': 'fr-david-words-acordes-ocultos',
  'elmilagrededoschicoshambrientos': 'jay-and-the-americans-this-magic-moment-acordes-ocultos',
  'elnombrequesalvounavidacuarentaanosdespues': 'the-poppy-family-which-way-you-goin-billy-acordes-ocultos',
  'bajocomprarcigarrilloslafugaquedesgarroaparis': 'kiki-dee-amoureuse-acordes-ocultos',
  'lacanciondeamorquecreyeronunamaldicion': 'silvio-rodriguez-ojala-acordes-ocultos',
  'elcolosodeunmetro': 'nelson-ned-dejame-si-estoy-llorando',
  'elcolosodeunmetroqueconquistoelmundo': 'nelson-ned-dejame-si-estoy-llorando',
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
  'muchachaitalianavieneacasarse': 'angelica-maria-a-donde-va-nuestro-amor-catedrales-de-leyenda'
};

async function audit() {
  const res = await fetch(`${supabaseUrl}/rest/v1/published_news?select=*&order=created_at.desc`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });

  if (!res.ok) {
    console.error('Fetch error:', await res.text());
    process.exit(1);
  }

  const rows = await res.json();
  const filtered = rows.filter(r => r.title && (r.image_url || r.video_url || r.web_article));

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

    let coverUrl =
      (availableCovers.has(slug) ? `/covers/${slug}.webp` : null) ||
      row.image_url ||
      cloudflare.cover ||
      (files.assets && files.assets.find(a => a.type === 'cover')?.url) ||
      '/assets/substack_header_banner.jpg';

    const instagramUrl = pp.instagram_reel_url || pp.instagram_url || row.instagram_url || undefined;
    const isHidden = row.status === 'hidden' || Boolean(pp.hidden) || Boolean(pp.is_hidden) || Boolean(story.hidden);

    const item = {
      id: String(row.id),
      slug,
      title,
      artist,
      songTitle: pp.music?.title || story.music?.title || undefined,
      category: pp.topic || story.topic || 'acordes-ocultos',
      content: row.web_article || pp.publication?.description || row.instagram_caption || row.tiktok_script || '',
      coverUrl,
      instagramUrl,
      isHidden,
      views: typeof pp.views === 'number' ? pp.views : (typeof row.views === 'number' ? row.views : 0),
      reach: typeof pp.reach === 'number' ? pp.reach : 0,
      igLikes: typeof pp.ig_likes === 'number' ? pp.ig_likes : 0,
      publishedAt: row.created_at || row.published_at,
      igPublishedAt: pp.ig_published_at || undefined,
      rawRow: row
    };

    const existing = itemsBySlug.get(slug);
    if (!existing) {
      itemsBySlug.set(slug, { item, row });
    } else {
      if (!existing.item.instagramUrl && item.instagramUrl) {
        itemsBySlug.set(slug, { item, row });
      }
    }
  }

  // Ahora procesamos cada item deduplicado
  const visibleStories = [];

  for (const { item, row } of itemsBySlug.values()) {
    // Verificar si cumple criterio de visibilidad pública
    const isVisible = !item.isHidden && Boolean(item.instagramUrl);
    if (!isVisible) continue;

    // Vincular crónica extendida exactamente como en stories.ts
    const itemSlugClean = item.slug.replace(/[^a-z0-9]/g, '');
    const itemSongClean = item.songTitle ? slugify(item.songTitle).replace(/[^a-z0-9]/g, '') : '';
    const itemArtistClean = item.artist ? slugify(item.artist).replace(/[^a-z0-9]/g, '') : '';

    const matchingArticleKey =
      CHRONICLE_ALIASES[item.slug] ||
      Object.keys(chroniclesMap).find(k => {
        const kClean = k.replace(/[^a-z0-9]/g, '');
        if (kClean === itemSlugClean || kClean.includes(itemSlugClean) || itemSlugClean.includes(kClean)) return true;
        if (itemSongClean.length >= 4 && kClean.includes(itemSongClean)) {
          if (itemArtistClean.length < 3 || kClean.includes(itemArtistClean.slice(0, 5))) return true;
        }
        if (itemArtistClean.length >= 4 && kClean.includes(itemArtistClean)) {
          const slugWords = item.slug.split(/[^a-z0-9]+/).filter(w => w.length >= 5);
          if (slugWords.length > 0 && slugWords.some(w => kClean.includes(w))) return true;
        }
        return false;
      });

    if (matchingArticleKey && chroniclesMap[matchingArticleKey]) {
      item.articleSlug = matchingArticleKey;
      const isCustomEdited = Boolean(row.production_plan?.custom_article);
      if (!isCustomEdited || !item.content || item.content.length < 1000) {
        item.content = chroniclesMap[matchingArticleKey];
      }
    }

    // Comprobar portada local WebP
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

    // Análisis de portada:
    // ¿Tiene portada dedicada real?
    // Si coverUrl es '/assets/substack_header_banner.jpg' o '/brand/acordes-ocultos-logo-sm.webp', o no existe localmente
    let hasDedicatedCover = false;
    let coverFileExists = false;
    let coverType = 'none';

    if (item.coverUrl.startsWith('/covers/')) {
      const coverFileName = item.coverUrl.replace('/covers/', '');
      const localCoverPath = path.join('web/public/covers', coverFileName);
      if (fs.existsSync(localCoverPath)) {
        hasDedicatedCover = true;
        coverFileExists = true;
        coverType = 'local_webp';
      }
    } else if (item.coverUrl.startsWith('http')) {
      hasDedicatedCover = true;
      coverType = 'remote_url';
    } else if (item.coverUrl.includes('substack_header_banner') || item.coverUrl.includes('acordes-ocultos-logo')) {
      hasDedicatedCover = false;
      coverType = 'placeholder';
    }

    // Análisis de crónica:
    // ¿Tiene crónica extendida? (>2000 caracteres o vinculada a chroniclesMap)
    const charCount = (item.content || '').length;
    const hasChronicle = charCount >= 2000 || Boolean(item.articleSlug);

    visibleStories.push({
      id: item.id,
      title: item.title,
      artist: item.artist,
      songTitle: item.songTitle,
      slug: item.slug,
      articleSlug: item.articleSlug,
      views: item.views,
      igLikes: item.igLikes,
      reach: item.reach,
      instagramUrl: item.instagramUrl,
      charCount,
      hasChronicle,
      coverUrl: item.coverUrl,
      hasDedicatedCover,
      coverType,
      publishedAt: item.publishedAt
    });
  }

  // Ordenar por reproducciones / views desc
  visibleStories.sort((a, b) => (b.views || 0) - (a.views || 0));

  console.log(`\n========================================================`);
  console.log(`📊 TOTAL PUBLICACIONES VISIBLES EN EL SITIO WEB: ${visibleStories.length}`);
  console.log(`========================================================\n`);

  const missingBoth = visibleStories.filter(s => !s.hasChronicle && !s.hasDedicatedCover);
  const missingChronicleOnly = visibleStories.filter(s => !s.hasChronicle && s.hasDedicatedCover);
  const missingCoverOnly = visibleStories.filter(s => s.hasChronicle && !s.hasDedicatedCover);
  const completeBoth = visibleStories.filter(s => s.hasChronicle && s.hasDedicatedCover);

  console.log(`1️⃣ SIN CRÓNICA Y SIN PORTADA (AMBAS FALTANTES): ${missingBoth.length}`);
  missingBoth.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.views.toLocaleString()} views | ${s.slug}]`);
    console.log(`     Título: ${s.title} — ${s.artist} («${s.songTitle || ''}»)`);
    console.log(`     Chars crónica: ${s.charCount} | Portada: ${s.coverUrl} (${s.coverType})\n`);
  });

  console.log(`\n2️⃣ SIN CRÓNICA EXTENDIDA (PERO SÍ TIENE PORTADA): ${missingChronicleOnly.length}`);
  missingChronicleOnly.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.views.toLocaleString()} views | ${s.slug}]`);
    console.log(`     Título: ${s.title} — ${s.artist} («${s.songTitle || ''}»)`);
    console.log(`     Chars crónica: ${s.charCount} | Portada: ${s.coverUrl} (${s.coverType})\n`);
  });

  console.log(`\n3️⃣ SIN PORTADA DEDICADA (PERO SÍ TIENE CRÓNICA EXTENDIDA): ${missingCoverOnly.length}`);
  missingCoverOnly.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.views.toLocaleString()} views | ${s.slug}]`);
    console.log(`     Título: ${s.title} — ${s.artist} («${s.songTitle || ''}»)`);
    console.log(`     Chars crónica: ${s.charCount} | Portada: ${s.coverUrl} (${s.coverType})\n`);
  });

  console.log(`\n4️⃣ COMPLETAS (CRÓNICA EXTENDIDA Y PORTADA): ${completeBoth.length}`);

  // Guardar resultado estructurado JSON para consumo detallado
  const resultData = {
    totalVisible: visibleStories.length,
    counts: {
      missingBoth: missingBoth.length,
      missingChronicleOnly: missingChronicleOnly.length,
      missingCoverOnly: missingCoverOnly.length,
      completeBoth: completeBoth.length
    },
    missingBoth,
    missingChronicleOnly,
    missingCoverOnly
  };

  fs.writeFileSync('scripts/audit_web_visibility_result.json', JSON.stringify(resultData, null, 2));
}

audit().catch(console.error);
