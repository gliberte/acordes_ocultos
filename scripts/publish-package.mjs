#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {basename, extname, join, resolve} from 'node:path';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
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
    '',
    `<b>Copy Instagram / TikTok</b>`,
    `<pre>${escapeHtml(copy)}</pre>`
  ].join('\n');

  return {
    title,
    artist: story.artist,
    music: story.music,
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

  const slug = normalizeTag(story.title).toLowerCase() || 'story';
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

  if (!options.dryRun && !options.skipTelegram) {
    await sendTelegramMessage(editorialPackage.telegramSummary);
    await sendTelegramDocument(files.copyPath, 'Copy Instagram / TikTok');
    await sendTelegramVideo(options.video, editorialPackage.title);
  }

  const result = {
    ok: true,
    dryRun: options.dryRun,
    files
  };

  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
