#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {basename, extname, join, resolve} from 'node:path';
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
  const artist = normalizeTag(story.artist);
  const song = normalizeTag(story.music?.title ?? '');
  const topic = normalizeTag(story.topic ?? '');

  return unique([
    artist,
    song,
    topic,
    'AcordesOcultos',
    'HistoriaDelRock',
    'RockTok',
    'Musica',
    'DatosMusicales',
    'HistoriasDeMusica',
    'TikTokMusic',
    'ReelsMusic',
    'RockClasico'
  ]).map((tag) => `#${tag}`);
};

const firstSentence = (text) => {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : text).trim();
};

const defaultDescription = (story) => {
  const music = story.music?.title ? `"${story.music.title}"` : 'su musica';
  const segments = story.segments?.map((segment) => segment.text).join(' ') || story.anecdote;

  return [
    `${story.title}: ${firstSentence(story.hook || story.anecdote)}`,
    '',
    `${segments}`,
    '',
    `Una historia corta sobre ${story.artist}, ${music} y esos momentos donde la leyenda del rock se vuelve mas grande que la cancion.`
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

  const copy = [
    description,
    '',
    commonTags
  ].join('\n');

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

  writeFileSync(packagePath, `${JSON.stringify(editorialPackage, null, 2)}\n`);
  writeFileSync(
    copyPath,
    [
      `# ${editorialPackage.title}`,
      '',
      '## Copy Instagram / TikTok',
      '',
      editorialPackage.copy
    ].join('\n')
  );

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

const uploadToCloudflare = async ({story, files, videoPath}) => {
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

  return {
    enabled: true,
    bucket: config.bucket,
    files: uploaded
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

const saveToSupabase = async ({story, editorialPackage, files, videoPath, videoStats, cloudflare}) => {
  const config = supabaseConfig();

  if (!config) {
    return {enabled: false, skippedReason: 'Supabase env vars are not configured.'};
  }

  const localFiles = {
    packagePath: files.packagePath,
    copyPath: files.copyPath,
    videoPath
  };
  const cloudflareFiles = cloudflare?.enabled ? cloudflare.files : null;
  const packageUrl = cloudflareFiles?.package?.url || null;
  const copyUrl = cloudflareFiles?.copy?.url || null;
  const videoUrl = cloudflareFiles?.video?.url || null;
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
      cloudflare: cloudflareFiles
    },
    package_url: packageUrl,
    copy_url: copyUrl,
    video_url: videoUrl,
    video_size_bytes: videoStats.size,
    published_at: new Date().toISOString()
  };

  const publishedNewsRow = {
    source_url: videoUrl || videoPath,
    title: editorialPackage.title,
    platform: 'instagram_reels',
    x_published: false,
    ig_published: false,
    web_article: editorialPackage.copy,
    youtube_url: null,
    image_url: null,
    tiktok_script: tiktokScript,
    status: 'published',
    production_plan: {
      slug: slugFor(story.title),
      artist: editorialPackage.artist,
      duration_seconds: editorialPackage.durationSeconds,
      music: story.music,
      instagram_music: editorialPackage.instagramMusic,
      hashtags: editorialPackage.hashtags,
      story,
      files: {
        local: localFiles,
        cloudflare: cloudflareFiles
      },
      package_url: packageUrl,
      copy_url: copyUrl,
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

const sendTelegramMessage = async (html) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN;
  const chatId =
    process.env.TELEGRAM_CHAT_ID ||
    process.env.TELEGRAM_CHANNEL_ID ||
    process.env.TG_CHAT_ID ||
    process.env.TG_CHANNEL_ID;

  if (!token || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_ID.');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    })
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

  let cloudflare = {enabled: false, skippedReason: 'Dry run.'};
  let supabase = {enabled: false, skippedReason: 'Dry run.'};

  if (!options.dryRun && !options.skipCloudflare) {
    cloudflare = await uploadToCloudflare({
      story,
      files,
      videoPath: options.video
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
      cloudflare
    });
  } else if (!options.dryRun) {
    supabase = {enabled: false, skippedReason: 'Skipped by --skip-supabase.'};
  }

  if (!options.dryRun && !options.skipTelegram) {
    let summary = editorialPackage.telegramSummary;
    if (cloudflare.enabled && cloudflare.files?.video?.url) {
      summary += `\n\n<b>Descargar Video (Cloudflare):</b> <a href="${cloudflare.files.video.url}">Enlace de descarga</a>`;
    } else {
      summary += `\n\n<b>Descargar Video (Cloudflare):</b> No disponible (Cloudflare desactivado o fallido)`;
    }
    await sendTelegramMessage(summary);
    await sendTelegramDocument(files.copyPath, 'Copy Instagram / TikTok');
  }

  const result = {
    ok: true,
    dryRun: options.dryRun,
    files,
    cloudflare,
    supabase
  };

  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
