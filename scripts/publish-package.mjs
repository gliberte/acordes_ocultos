#!/usr/bin/env node
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultStoryPath = join(rootDir, 'src/data/story.json');
const defaultVideoPath = join(rootDir, 'out/story.mp4');
const packageDir = join(rootDir, 'out/production-package');

const loadEnv = (customEnvPath) => {
  const envPath = customEnvPath ? resolve(customEnvPath) : join(rootDir, '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts
      .join('=')
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    story: defaultStoryPath,
    video: defaultVideoPath,
    dryRun: false,
    skipTelegram: false,
    skipCloudflare: false,
    skipSupabase: false,
    skipVault: false,
    env: process.env.ENV_FILE
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--story') {
      options.story = resolve(args[index + 1]);
      index += 1;
    } else if (arg === '--video') {
      options.video = resolve(args[index + 1]);
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--env') {
      options.env = resolve(args[index + 1]);
      index += 1;
    } else if (arg === '--skip-telegram') {
      options.skipTelegram = true;
    } else if (arg === '--skip-cloudflare') {
      options.skipCloudflare = true;
    } else if (arg === '--skip-supabase') {
      options.skipSupabase = true;
    } else if (arg === '--skip-vault') {
      options.skipVault = true;
    }
  }

  return options;
};

const normalizeTag = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .trim();

const unique = (items) => Array.from(new Set(items.filter(Boolean)));

const slugFor = (value) => normalizeTag(value).toLowerCase() || 'story';

const hashtagsFor = (story) => {
  const isEnglish = story.brand === 'secret-chords';
  const artist = normalizeTag(story.artist);
  const song = normalizeTag(story.music?.title ?? '');
  
  let topicRaw = story.topic ?? '';
  if (isEnglish && topicRaw.toLowerCase() === 'curiosidad musical') {
    topicRaw = 'musicalcuriosity';
  }
  const topic = normalizeTag(topicRaw);

  const brandTag = isEnglish ? 'SecretChords' : 'AcordesOcultos';
  const historyTag = isEnglish ? 'RockHistory' : 'HistoriaDelRock';
  const rocktokTag = 'RockTok';
  const musicTag = isEnglish ? 'Music' : 'Musica';

  return unique([
    artist,
    song,
    topic,
    brandTag,
    historyTag,
    rocktokTag,
    musicTag
  ]).slice(0, 5).map((tag) => `#${tag}`);
};

const firstSentence = (text) => {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : text).trim();
};

const defaultDescription = (story) => {
  const segments = story.segments?.map((segment) => segment.text).join(' ') || story.anecdote;

  return [
    `${story.title}: ${firstSentence(story.hook || story.anecdote)}`,
    '',
    `${segments}`
  ].join('\n');
};

const buildEditorialPackage = (story) => {
  const tags = hashtagsFor(story);
  const commonTags = tags.slice(0, 10).join(' ');
  const title = `${story.title} | Acordes Ocultos`;
  const description = story.publication?.description || defaultDescription(story);
  const instagramMusic = story.music?.instagram || {
    query: [story.music?.title, story.music?.artist].filter(Boolean).join(' '),
    status: 'manual_check_required'
  };

  const tiktokDescription = story.publication?.tiktokDescription || [
    `${story.hook || story.title} 🤯 Conoce la historia de ${story.artist} y «${story.music?.title || story.title}». 👇`,
    '',
    commonTags
  ].join('\n');

  const copy = [
    description,
    '',
    commonTags
  ].join('\n');

  const tiktokCopy = tiktokDescription.trim();

  if (copy.length > 2100) {
    console.warn(`\n⚠️  ADVERTENCIA: El copy tiene ${copy.length} caracteres y supera el límite de Instagram (2.200 caracteres máx). Podría cortarse.`);
  } else {
    console.log(`📏 Longitud del Copy Instagram / Reels: ${copy.length} caracteres (rango óptimo: 900 - 1.400).`);
  }

  const telegramSummary = [
    `<b>${escapeHtml(title)}</b>`,
    '',
    `<b>Artista:</b> ${escapeHtml(story.artist)}`,
    `<b>Tema:</b> ${escapeHtml(story.music?.title || 'N/A')}`,
    `<b>Duracion:</b> ${escapeHtml(story.durationSeconds || 90)}s`,
    `<b>Audio Instagram:</b> ${escapeHtml(instagramMusic.status || 'manual_check_required')} (${escapeHtml(instagramMusic.query || story.music?.title || 'N/A')})`,
    '',
    `<b>Copy Instagram / TikTok</b>`,
    `<pre>${escapeHtml(copy)}</pre>`
  ].join('\n');

  return {
    title,
    artist: story.artist,
    durationSeconds: story.durationSeconds || 90,
    music: story.music,
    instagramMusic,
    copy,
    tiktokCopy,
    hashtags: tags,
    telegramSummary
  };
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const writeProductionFiles = (story, editorialPackage) => {
  mkdirSync(packageDir, {recursive: true});

  const slug = slugFor(story.title);
  const packagePath = join(packageDir, `${slug}-package.json`);
  const copyPath = join(packageDir, `${slug}-copys.md`);

  const fullMarkdownCopys = [
    `# ${editorialPackage.title}`,
    '',
    '## 📸 1. COPY PARA INSTAGRAM REELS',
    '',
    editorialPackage.copy,
    '',
    '---',
    '',
    '## 🎵 2. COPY PARA TIKTOK',
    '',
    editorialPackage.tiktokCopy
  ].join('\n');

  const fullTextCopys = [
    '========================================',
    '📸 1. COPY PARA INSTAGRAM REELS (90s)',
    '========================================',
    '',
    editorialPackage.copy,
    '',
    '========================================',
    '🎵 2. COPY PARA TIKTOK (60s)',
    '========================================',
    '',
    editorialPackage.tiktokCopy
  ].join('\n');

  writeFileSync(packagePath, `${JSON.stringify(editorialPackage, null, 2)}\n`);
  writeFileSync(copyPath, `${fullMarkdownCopys}\n`);

  // Guardar copys directamente en la carpeta de producción del video (todos los elementos juntos)
  const firstAsset = story.assets?.[0]?.src;
  if (firstAsset) {
    const videoDir = join(rootDir, 'public', dirname(firstAsset));
    if (existsSync(videoDir)) {
      writeFileSync(join(videoDir, 'copys.md'), `${fullMarkdownCopys}\n`, 'utf8');
      writeFileSync(join(videoDir, 'copys.txt'), `${fullTextCopys}\n`, 'utf8');
    }
  }
  writeFileSync(join(rootDir, 'out/copys.md'), `${fullMarkdownCopys}\n`, 'utf8');
  writeFileSync(join(rootDir, 'out/copys.txt'), `${fullTextCopys}\n`, 'utf8');

  return {packagePath, copyPath};
};

const requiredEnv = (keys, integrationName) => {
  const present = keys.filter((key) => process.env[key]);

  if (present.length === 0) {
    return null;
  }

  const missing = keys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`${integrationName} is partially configured. Missing: ${missing.join(', ')}`);
  }

  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
};

const normalizeUrl = (value) => String(value).replace(/\/+$/g, '');

const contentTypeFor = (filePath) => {
  const extension = extname(filePath).toLowerCase();

  if (extension === '.mp4') {
    return 'video/mp4';
  }

  if (extension === '.webp') {
    return 'image/webp';
  }

  if (extension === '.png') {
    return 'image/png';
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }

  if (extension === '.json') {
    return 'application/json';
  }

  if (extension === '.md') {
    return 'text/markdown; charset=utf-8';
  }

  return 'application/octet-stream';
};

const cloudflareConfig = () => {
  const config = requiredEnv(
    [
      'CLOUDFLARE_R2_ACCOUNT_ID',
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      'CLOUDFLARE_R2_BUCKET'
    ],
    'Cloudflare R2'
  );

  if (!config) {
    return null;
  }

  return {
    accountId: config.CLOUDFLARE_R2_ACCOUNT_ID,
    accessKeyId: config.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: config.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucket: config.CLOUDFLARE_R2_BUCKET,
    publicUrl:
      process.env.CLOUDFLARE_R2_PUBLIC_URL ||
      process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN ||
      '',
    prefix: (process.env.CLOUDFLARE_R2_PREFIX || 'acordes-ocultos').replace(/^\/+|\/+$/g, '')
  };
};

const uploadToCloudflare = async ({story, files, videoPath, coverPath, coverWebpPath, teaserPath, heroBannerPath}) => {
  const config = cloudflareConfig();

  if (!config) {
    return {enabled: false, skippedReason: 'Cloudflare R2 env vars are not configured.'};
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  const slug = slugFor(story.title);
  const publishedAt = new Date().toISOString().replace(/[:.]/g, '-');
  const baseKey = [config.prefix, slug, publishedAt].filter(Boolean).join('/');
  const targets = {
    video: {path: videoPath, key: `${baseKey}/${basename(videoPath)}`},
    copy: {path: files.copyPath, key: `${baseKey}/${basename(files.copyPath)}`},
    package: {path: files.packagePath, key: `${baseKey}/${basename(files.packagePath)}`}
  };

  if (coverPath) {
    targets.cover = {path: coverPath, key: `${baseKey}/${basename(coverPath)}`};
  }

  if (coverWebpPath && existsSync(coverWebpPath)) {
    targets.cover_webp = {path: coverWebpPath, key: `${baseKey}/cover.webp`};
  }

  if (teaserPath) {
    targets.story_teaser = {path: teaserPath, key: `${baseKey}/${basename(teaserPath)}`};
  }

  if (heroBannerPath) {
    targets.hero_banner = {path: heroBannerPath, key: `${baseKey}/${basename(heroBannerPath)}`};
  }

  const tiktokVideo = join(rootDir, 'out/story_tiktok.mp4');
  if (existsSync(tiktokVideo)) {
    targets.video_tiktok = {path: tiktokVideo, key: `${baseKey}/story_tiktok.mp4`};
  }

  const uploaded = {};

  for (const [name, target] of Object.entries(targets)) {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: target.key,
        Body: readFileSync(target.path),
        ContentType: contentTypeFor(target.path)
      })
    );

    uploaded[name] = {
      key: target.key,
      url: config.publicUrl ? `${normalizeUrl(config.publicUrl)}/${target.key}` : null
    };
  }

  const assetsUploaded = [];
  if (story.assets && Array.isArray(story.assets)) {
    for (const asset of story.assets) {
      if (asset.src) {
        const localPath = join(rootDir, 'public', asset.src);
        if (existsSync(localPath)) {
          const key = `${baseKey}/assets/${basename(asset.src)}`;
          await client.send(
            new PutObjectCommand({
              Bucket: config.bucket,
              Key: key,
              Body: readFileSync(localPath),
              ContentType: contentTypeFor(localPath)
            })
          );
          assetsUploaded.push({
            src: asset.src,
            key,
            url: config.publicUrl ? `${normalizeUrl(config.publicUrl)}/${key}` : null
          });
        }
      }
    }
  }

  return {
    enabled: true,
    bucket: config.bucket,
    files: uploaded,
    assets: assetsUploaded
  };
};

const supabaseConfig = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!process.env.SUPABASE_URL && !key) {
    return null;
  }

  if (!process.env.SUPABASE_URL || !key) {
    throw new Error('Supabase is partially configured. Missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY');
  }

  return {
    url: normalizeUrl(process.env.SUPABASE_URL),
    key,
    table: process.env.SUPABASE_PUBLICATIONS_TABLE || 'published_news'
  };
};

const saveToSupabase = async ({story, editorialPackage, files, videoPath, videoStats, cloudflare, coverPath, teaserPath, heroBannerPath}) => {
  const config = supabaseConfig();

  if (!config) {
    return {enabled: false, skippedReason: 'Supabase env vars are not configured.'};
  }

  const localFiles = {
    packagePath: files.packagePath,
    copyPath: files.copyPath,
    videoPath,
    coverPath,
    teaserPath,
    heroBannerPath
  };
  const cloudflareFiles = cloudflare?.enabled ? cloudflare.files : null;
  const cloudflareAssets = cloudflare?.enabled ? cloudflare.assets : null;
  const packageUrl = cloudflareFiles?.package?.url || null;
  const copyUrl = cloudflareFiles?.copy?.url || null;
  const videoUrl = cloudflareFiles?.video?.url || null;
  const coverUrl = cloudflareFiles?.cover_webp?.url || cloudflareFiles?.cover?.url || null;
  const teaserUrl = cloudflareFiles?.story_teaser?.url || null;
  const heroImageUrl = cloudflareFiles?.hero_banner?.url || null;
  const tiktokScript =
    story.segments?.map((segment) => segment.text).join('\n') ||
    story.anecdote ||
    editorialPackage.copy;

  const legacyRow = {
    slug: slugFor(story.title),
    title: editorialPackage.title,
    artist: editorialPackage.artist,
    duration_seconds: editorialPackage.durationSeconds,
    music_title: story.music?.title || null,
    music_artist: story.music?.artist || null,
    instagram_music: editorialPackage.instagramMusic,
    topic: story.topic || null,
    copy: editorialPackage.copy,
    hashtags: editorialPackage.hashtags,
    story,
    files: {
      local: localFiles,
      cloudflare: cloudflareFiles,
      assets: cloudflareAssets
    },
    package_url: packageUrl,
    copy_url: copyUrl,
    video_url: videoUrl,
    cover_url: coverUrl,
    teaser_url: teaserUrl,
    video_size_bytes: videoStats.size,
    published_at: new Date().toISOString()
  };

  const storySlug = slugFor(story.title);
  let resolvedWebArticle = editorialPackage.copy;
  const articlesBase = join(rootDir, 'articles');
  let matchedArticleSlug = null;
  if (existsSync(articlesBase)) {
    const assetFolder = story.assets?.[0]?.src ? dirname(story.assets[0].src).replace(/^videos\//, '').replace(/^.*\//, '') : null;
    const musicFolder = story.music?.src ? dirname(story.music.src).replace(/^music\//, '').replace(/^.*\//, '') : null;
    const artistClean = slugFor(story.artist || '').replace(/-/g, '');
    const songClean = slugFor(story.music?.title || '').replace(/-/g, '');

    const candidateDirs = [
      story.articleSlug,
      story.slug,
      assetFolder,
      musicFolder,
      storySlug,
      normalizeTag(story.artist || '').toLowerCase()
    ].filter(Boolean);

    for (const c of candidateDirs) {
      const p = join(articlesBase, c, 'article.md');
      if (existsSync(p)) {
        resolvedWebArticle = readFileSync(p, 'utf8');
        matchedArticleSlug = c;
        break;
      }
    }

    if (resolvedWebArticle === editorialPackage.copy) {
      try {
        const entries = readdirSync(articlesBase, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory() && e.name !== 'assets') {
            const eClean = e.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            // Check matching both artist and song in directory name
            if (artistClean && songClean && eClean.includes(artistClean) && eClean.includes(songClean)) {
              const p = join(articlesBase, e.name, 'article.md');
              if (existsSync(p)) {
                resolvedWebArticle = readFileSync(p, 'utf8');
                matchedArticleSlug = e.name;
                break;
              }
            }
            if (e.name.includes(storySlug) || storySlug.includes(e.name)) {
              const p = join(articlesBase, e.name, 'article.md');
              if (existsSync(p)) {
                resolvedWebArticle = readFileSync(p, 'utf8');
                matchedArticleSlug = e.name;
                break;
              }
            }
          }
        }
      } catch (_) {}
    }
  }

  if (matchedArticleSlug) {
    console.log(`📰 [Web] Crónica extendida enlazada con éxito desde articles/${matchedArticleSlug}/ (${resolvedWebArticle.length} caracteres).`);
  } else {
    console.warn('⚠️ [Web] No se encontró crónica extendida en articles/. Se usará el copy como respaldo.');
  }

  const publishedNewsRow = {
    source_url: videoUrl || videoPath,
    title: editorialPackage.title,
    platform: 'instagram_reels',
    x_published: false,
    ig_published: false,
    web_article: resolvedWebArticle,
    youtube_url: null,
    image_url: coverUrl,
    tiktok_script: tiktokScript,
    status: 'published',
    production_plan: {
      slug: slugFor(story.title),
      article_slug: matchedArticleSlug,
      artist: editorialPackage.artist,
      duration_seconds: editorialPackage.durationSeconds,
      music: story.music,
      instagram_music: editorialPackage.instagramMusic,
      hashtags: editorialPackage.hashtags,
      story,
      files: {
        local: localFiles,
        cloudflare: cloudflareFiles,
        assets: cloudflareAssets
      },
      package_url: packageUrl,
      copy_url: copyUrl,
      story_teaser_url: teaserUrl,
      hero_image: heroImageUrl,
      video_size_bytes: videoStats.size,
      generated_at: new Date().toISOString()
    },
    video_url: videoUrl,
    tweet: null,
    instagram_caption: editorialPackage.copy,
    telegram_published: false
  };

  const row = config.table === 'published_news' ? publishedNewsRow : legacyRow;

  const response = await fetch(`${config.url}/rest/v1/${config.table}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      'content-type': 'application/json',
      prefer: 'return=representation'
    },
    body: JSON.stringify(row)
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase insert failed: ${JSON.stringify(payload)}`);
  }

  return {
    enabled: true,
    table: config.table,
    row: Array.isArray(payload) ? payload[0] : payload
  };
};

const sendTelegramMessage = async (html, replyMarkup = null) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN;
  const chatId =
    process.env.TELEGRAM_CHAT_ID ||
    process.env.TELEGRAM_CHANNEL_ID ||
    process.env.TG_CHAT_ID ||
    process.env.TG_CHANNEL_ID;

  if (!token || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_ID.');
  }

  const body = {
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
    disable_web_page_preview: false
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body)
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(payload)}`);
  }

  return payload.result;
};

const sendTelegramDocument = async (filePath, caption) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN;
  const chatId =
    process.env.TELEGRAM_CHAT_ID ||
    process.env.TELEGRAM_CHANNEL_ID ||
    process.env.TG_CHAT_ID ||
    process.env.TG_CHANNEL_ID;

  if (!token || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_ID.');
  }

  const form = new FormData();
  const file = new Blob([readFileSync(filePath)], {type: 'application/octet-stream'});
  form.append('chat_id', chatId);
  form.append('caption', caption);
  form.append('document', file, basename(filePath));

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: form
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(`Telegram sendDocument failed: ${JSON.stringify(payload)}`);
  }

  return payload.result;
};

const sendTelegramVideo = async (videoPath, caption) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN;
  const chatId =
    process.env.TELEGRAM_CHAT_ID ||
    process.env.TELEGRAM_CHANNEL_ID ||
    process.env.TG_CHAT_ID ||
    process.env.TG_CHANNEL_ID;

  if (!token || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_ID.');
  }

  const form = new FormData();
  const file = new Blob([readFileSync(videoPath)], {type: 'video/mp4'});
  form.append('chat_id', chatId);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('video', file, basename(videoPath));

  const response = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: 'POST',
    body: form
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(`Telegram sendVideo failed: ${JSON.stringify(payload)}`);
  }

  return payload.result;
};

const optimizeCoverForWeb = ({story, coverPath}) => {
  if (!coverPath || !existsSync(coverPath)) return null;
  const candidateSlugs = unique([
    slugFor(story.title || ''),
    story.slug,
    story.articleSlug
  ]);
  if (candidateSlugs.length === 0) return null;

  const webCoversDir = join(rootDir, 'web/public/covers');
  const publicCoversDir = join(rootDir, 'public/covers');
  mkdirSync(webCoversDir, { recursive: true });
  mkdirSync(publicCoversDir, { recursive: true });

  const primarySlug = candidateSlugs[0];
  const primaryWebp = join(webCoversDir, `${primarySlug}.webp`);

  try {
    const cwebp = ['/usr/local/bin/cwebp', '/opt/homebrew/bin/cwebp', 'cwebp'].find(c => {
      try { execSync(`which ${c}`, { stdio: 'ignore' }); return true; } catch (_) { return false; }
    });
    if (cwebp) {
      execSync(`"${cwebp}" -q 80 -resize 480 854 "${coverPath}" -o "${primaryWebp}"`, { stdio: 'pipe' });

      const manifestPath = join(rootDir, 'web/src/data/available_covers.json');
      let manifest = [];
      if (existsSync(manifestPath)) {
        try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch (_) {}
      }

      for (const s of candidateSlugs) {
        const targetWebp = join(webCoversDir, `${s}.webp`);
        const publicWebp = join(publicCoversDir, `${s}.webp`);
        if (targetWebp !== primaryWebp) {
          copyFileSync(primaryWebp, targetWebp);
        }
        copyFileSync(primaryWebp, publicWebp);
        if (!manifest.includes(s)) {
          manifest.push(s);
        }
      }

      writeFileSync(manifestPath, JSON.stringify(manifest.sort(), null, 2));
      console.log(`🖼️ [Web] Portada WebP optimizada (${candidateSlugs.join(', ')}): ${(statSync(primaryWebp).size / 1024).toFixed(1)} KB`);
      return primaryWebp;
    }
  } catch (err) {
    console.warn(`⚠️ Error al generar WebP para portada: ${err.message}`);
  }
  return null;
};

const optimizeHeroForWeb = ({story, heroPath}) => {
  if (!heroPath || !existsSync(heroPath)) return;
  const slug = story.slug || slugFor(story.title || '');
  if (!slug) return;

  const webHeroesDir = join(rootDir, 'web/public/images/heroes');
  const publicHeroesDir = join(rootDir, 'public/images/heroes');
  mkdirSync(webHeroesDir, { recursive: true });
  mkdirSync(publicHeroesDir, { recursive: true });

  const targetWebp = join(webHeroesDir, `${slug}.webp`);
  const publicWebp = join(publicHeroesDir, `${slug}.webp`);

  try {
    const cwebp = ['/usr/local/bin/cwebp', '/opt/homebrew/bin/cwebp', 'cwebp'].find(c => {
      try { execSync(`which ${c}`, { stdio: 'ignore' }); return true; } catch (_) { return false; }
    });
    if (cwebp) {
      execSync(`"${cwebp}" -q 82 -resize 1600 900 "${heroPath}" -o "${targetWebp}"`, { stdio: 'pipe' });
      copyFileSync(targetWebp, publicWebp);
      console.log(`🖼️ [Web] Hero horizontal WebP optimizado: ${targetWebp} (${(statSync(targetWebp).size / 1024).toFixed(1)} KB)`);

      // Update available_heroes.json manifest
      const manifestPath = join(rootDir, 'web/src/data/available_heroes.json');
      let manifest = [];
      if (existsSync(manifestPath)) {
        try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch (_) {}
      }
      if (!manifest.includes(slug)) {
        manifest.push(slug);
        writeFileSync(manifestPath, JSON.stringify(manifest.sort(), null, 2));
      }
    }
  } catch (err) {
    console.warn(`⚠️ Error al generar WebP para hero horizontal: ${err.message}`);
  }
};

const main = async () => {
  const options = parseArgs();
  loadEnv(options.env);

  if (!existsSync(options.story)) {
    throw new Error(`Story JSON not found: ${options.story}`);
  }

  if (!existsSync(options.video)) {
    throw new Error(`Video not found: ${options.video}`);
  }

  const story = JSON.parse(readFileSync(options.story, 'utf8'));
  const videoStats = statSync(options.video);

  const editorialPackage = buildEditorialPackage(story);
  const files = writeProductionFiles(story, {
    ...editorialPackage,
    video: {
      path: options.video,
      filename: basename(options.video),
      sizeBytes: videoStats.size,
      extension: extname(options.video)
    }
  });

  let coverPath = null;
  let teaserPath = null;
  const firstAsset = story.assets?.[0]?.src;
  if (firstAsset) {
    const coverName = story.brand === 'secret-chords' ? 'cover_eng.png' : 'cover.png';
    let potentialCover = join(rootDir, 'public', firstAsset, '..', coverName);
    if (!existsSync(potentialCover) && story.brand === 'secret-chords') {
      potentialCover = join(rootDir, 'public', firstAsset, '..', 'cover.png');
    }
    if (existsSync(potentialCover)) {
      coverPath = potentialCover;
    }

    const potentialTeaser = join(rootDir, 'public', firstAsset, '..', 'story_teaser.png');
    if (existsSync(potentialTeaser)) {
      teaserPath = potentialTeaser;
    }
  }

  if (!coverPath) {
    const outCover = join(rootDir, 'out', story.brand === 'secret-chords' ? 'cover_eng.png' : 'cover.png');
    if (existsSync(outCover)) {
      coverPath = outCover;
    }
  }

  if (!teaserPath) {
    const outTeaser = join(rootDir, 'out', 'story_teaser.png');
    if (existsSync(outTeaser)) {
      teaserPath = outTeaser;
    }
  }

  let heroBannerPath = null;
  if (firstAsset) {
    for (const name of ['hero_banner.png', 'hero.png', 'landscape.png', 'cover_wide.png']) {
      const potentialHero = join(rootDir, 'public', firstAsset, '..', name);
      if (existsSync(potentialHero)) {
        heroBannerPath = potentialHero;
        break;
      }
    }
  }

  if (!heroBannerPath) {
    for (const name of ['hero_banner.png', 'hero.png', 'cover_wide.png']) {
      const outHero = join(rootDir, 'out', name);
      if (existsSync(outHero)) {
        heroBannerPath = outHero;
        break;
      }
    }
  }

  if (!heroBannerPath) {
    const storySlug = slugFor(story.title);
    for (const name of ['hero_banner.png', 'hero.png', 'cover_wide.png']) {
      const artHero = join(rootDir, 'articles', storySlug, 'images', name);
      if (existsSync(artHero)) {
        heroBannerPath = artHero;
        break;
      }
    }
  }

  // Automatically optimize cover for web (WebP 480x854, ~15-25 KB)
  let coverWebpPath = null;
  if (coverPath) {
    coverWebpPath = optimizeCoverForWeb({story, coverPath});
  }

  // Automatically optimize hero banner for web (WebP 1600x900, ~50-80 KB)
  if (heroBannerPath) {
    optimizeHeroForWeb({story, heroPath: heroBannerPath});
  }

  let cloudflare = {enabled: false, skippedReason: 'Dry run.'};
  let supabase = {enabled: false, skippedReason: 'Dry run.'};

  if (!options.dryRun && !options.skipCloudflare) {
    cloudflare = await uploadToCloudflare({
      story,
      files,
      videoPath: options.video,
      coverPath,
      coverWebpPath,
      teaserPath,
      heroBannerPath
    });
  } else if (!options.dryRun) {
    cloudflare = {enabled: false, skippedReason: 'Skipped by --skip-cloudflare.'};
  }

  if (!options.dryRun && !options.skipSupabase) {
    supabase = await saveToSupabase({
      story,
      editorialPackage,
      files,
      videoPath: options.video,
      videoStats,
      cloudflare,
      coverPath,
      teaserPath,
      heroBannerPath
    });
  } else if (!options.dryRun) {
    supabase = {enabled: false, skippedReason: 'Skipped by --skip-supabase.'};
  }

  if (!options.dryRun && !options.skipTelegram) {
    let summary = [
      `<b>${escapeHtml(editorialPackage.title)}</b>`,
      '',
      `<b>Artista:</b> ${escapeHtml(story.artist)}`,
      `<b>Tema:</b> ${escapeHtml(story.music?.title || 'N/A')}`,
      `<b>Duracion:</b> ${escapeHtml(story.durationSeconds || 90)}s`,
      `<b>Audio Instagram:</b> ${escapeHtml(editorialPackage.instagramMusic?.status || 'manual_check_required')} (${escapeHtml(editorialPackage.instagramMusic?.query || story.music?.title || 'N/A')})`
    ].join('\n');

    if (cloudflare.enabled && cloudflare.files?.video?.url) {
      summary += `\n\n🎬 <b>Descargar Video Reels 90s:</b> <a href="${cloudflare.files.video.url}">Enlace directo</a>`;
    }
    if (cloudflare.enabled && cloudflare.files?.video_tiktok?.url) {
      summary += `\n📱 <b>Descargar Video TikTok 60s:</b> <a href="${cloudflare.files.video_tiktok.url}">Enlace directo</a>`;
    }

    await sendTelegramMessage(summary);

    // Mensaje exclusivo para Copy de Instagram con toque directo para copiar
    const copyIgMessage = [
      `<b>📋 COPY INSTAGRAM (Toca el recuadro abajo para copiar todo con un solo toque):</b>`,
      '',
      `<pre>${escapeHtml(editorialPackage.copy)}</pre>`
    ].join('\n');
    await sendTelegramMessage(copyIgMessage);

    // Mensaje exclusivo para Copy de TikTok si existe en out/copys.md
    const outCopysPath = join(rootDir, 'out/copys.md');
    if (existsSync(outCopysPath)) {
      const fullCopys = readFileSync(outCopysPath, 'utf8');
      const parts = fullCopys.split('## 🎵 2. COPY PARA TIKTOK');
      if (parts.length > 1) {
        const cleanTiktok = parts[1].replace(/^\s*\*[^*]+\*\s*/, '').trim();
        if (cleanTiktok) {
          const copyTtMessage = [
            `<b>🎵 COPY TIKTOK (Toca el recuadro abajo para copiar con un solo toque):</b>`,
            '',
            `<pre>${escapeHtml(cleanTiktok)}</pre>`
          ].join('\n');
          await sendTelegramMessage(copyTtMessage);
        }
      }
    }
    await sendTelegramDocument(files.copyPath, '📄 Copy Instagram / TikTok');
    if (coverPath) {
      await sendTelegramDocument(coverPath, '🖼️ Portada (Instagram / Reels)');
    }
    if (heroBannerPath) {
      await sendTelegramDocument(heroBannerPath, '🖼️ Banner Web Horizontal (16:9 Widescreen)');
    }
    if (teaserPath) {
      await sendTelegramDocument(teaserPath, '🎞️ Avance para Historias (Instagram Stories Teaser)');
    }
    if (existsSync(options.video)) {
      try {
        let videoToSend = options.video;
        const sizeMb = statSync(options.video).size / (1024 * 1024);
        if (sizeMb > 48) {
          const tgVideo = join(rootDir, 'out/story_90s_tg.mp4');
          console.log(`⚡ Comprimiendo video de 90s para Telegram (${sizeMb.toFixed(1)}MB > 48MB)...`);
          execSync(`ffmpeg -y -i "${options.video}" -vcodec libx264 -crf 28 -preset faster -c:a aac -b:a 128k "${tgVideo}"`, {stdio: 'inherit'});
          videoToSend = tgVideo;
        }
        await sendTelegramDocument(videoToSend, `Video Reels (90s) - ${story.artist} - ${story.title}`);
      } catch (err) {
        console.warn(`Could not send main video to Telegram: ${err.message}`);
      }
    }
    const tiktokVideoPath = join(rootDir, 'out/story_tiktok.mp4');
    if (existsSync(tiktokVideoPath)) {
      try {
        let tiktokToSend = tiktokVideoPath;
        const sizeMb = statSync(tiktokVideoPath).size / (1024 * 1024);
        if (sizeMb > 48) {
          const tgTiktok = join(rootDir, 'out/story_tiktok_tg.mp4');
          console.log(`⚡ Comprimiendo video de TikTok para Telegram (${sizeMb.toFixed(1)}MB > 48MB)...`);
          execSync(`ffmpeg -y -i "${tiktokVideoPath}" -vcodec libx264 -crf 28 -preset faster -c:a aac -b:a 128k "${tgTiktok}"`, {stdio: 'inherit'});
          tiktokToSend = tgTiktok;
        }
        await sendTelegramDocument(tiktokToSend, `Video TikTok Cut (60s) - ${story.artist} - ${story.title}`);
      } catch (err) {
        console.warn(`Could not send TikTok video to Telegram: ${err.message}`);
      }
    }
  }

  // Sincronización con la Bóveda Maestra (Google Drive / Vault)
  let vault = {enabled: false, skippedReason: 'Not configured or skipped.'};
  if (!options.dryRun && !options.skipVault && process.env.GOOGLE_DRIVE_VAULT_PATH) {
    try {
      console.log('\n🏛️  Sincronizando automáticamente con la Bóveda Maestra...');
      const {execSync} = await import('node:child_process');
      execSync(`node scripts/backup-vault.mjs --story "${options.story}"`, {
        cwd: rootDir,
        stdio: 'inherit'
      });
      vault = {enabled: true, path: process.env.GOOGLE_DRIVE_VAULT_PATH};
    } catch (vaultErr) {
      console.warn(`⚠️ Error al sincronizar con la Bóveda: ${vaultErr.message}`);
      vault = {enabled: false, error: vaultErr.message};
    }
  }

  // Sincronización automática de recursos web (portadas WebP, imágenes de artículos y dataset chronicles.json) + Git Push
  if (!options.dryRun) {
    try {
      console.log('\n🌐 Sincronizando recursos optimizados para la Web (Portadas WebP, Artículos & Dataset)...');
      const {execSync} = await import('node:child_process');
      execSync('node scripts/generate-webp-covers.mjs', { cwd: rootDir, stdio: 'inherit' });
      execSync('node scripts/optimize-web-images.mjs', { cwd: rootDir, stdio: 'inherit' });
      execSync('node scripts/compile-chronicles.mjs', { cwd: rootDir, stdio: 'inherit' });

      // Auto-commit y push de portadas y activos web para que jamás queden sin desplegar en producción
      const syncPaths = [
        'web/public/covers',
        'public/covers',
        'web/public/articles',
        'web/public/images/heroes',
        'web/src/data/available_covers.json',
        'web/src/data/available_heroes.json',
        'web/src/data/chronicles.json'
      ];
      execSync(`git add ${syncPaths.join(' ')}`, { cwd: rootDir, stdio: 'ignore' });
      const diffCheck = execSync('git diff --cached --name-only', { cwd: rootDir, encoding: 'utf8' }).trim();
      if (diffCheck) {
        console.log('🚀 Subiendo automáticamente portadas WebP y activos sincronizados a Git (origin/main)...');
        execSync(`git commit -m "chore(web): auto-sync WebP covers and chronicle assets [${slugFor(story.title)}]"`, { cwd: rootDir, stdio: 'inherit' });
        execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });
        console.log('✅ Portadas y activos web desplegados en Git/Vercel con éxito.');
      }
    } catch (webErr) {
      console.warn(`⚠️ Aviso al sincronizar/subir recursos web: ${webErr.message}`);
    }
  }

  const result = {
    ok: true,
    dryRun: options.dryRun,
    files,
    cloudflare,
    supabase,
    vault
  };

  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
