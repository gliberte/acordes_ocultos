#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {basename, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultCarouselPath = join(rootDir, 'src/data/carousel.json');
const carouselOutDir = join(rootDir, 'out/carousel');
const packageDir = join(rootDir, 'out/production-package');

const loadEnv = (customEnvPath) => {
  const envPath = customEnvPath ? resolve(customEnvPath) : join(rootDir, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    carousel: defaultCarouselPath,
    dryRun: false,
    skipTelegram: false,
    skipCloudflare: false,
    skipSupabase: false,
    env: process.env.ENV_FILE
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--carousel') {
      options.carousel = resolve(args[index + 1]);
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
const slugFor = (value) => normalizeTag(value).toLowerCase() || 'carousel';

const hashtagsFor = (carouselData) => {
  const artist = normalizeTag(carouselData.artist);
  const topic = normalizeTag(carouselData.topic ?? '');
  const customTags = carouselData.hashtags || [];

  return unique([
    artist,
    topic,
    ...customTags.map(t => normalizeTag(t)),
    'AcordesOcultos',
    'HistoriaDelRock',
    'DatosMusicales',
    'HistoriasDeMusica',
    'ReelsMusic',
    'RockClasico'
  ]).map((tag) => `#${tag}`);
};

const defaultDescription = (carouselData) => {
  const beatsText = carouselData.slides
    .slice(1, -1) // skip cover and cta
    .map((slide) => slide.text)
    .join(' ');

  return [
    `${carouselData.title}: ${carouselData.slides[0].text}`,
    '',
    `${beatsText}`,
    '',
    `Una historia corta sobre ${carouselData.artist} y esos momentos donde la leyenda de la música nos conmueve.`
  ].join('\n');
};

const buildEditorialPackage = (carouselData) => {
  const tags = hashtagsFor(carouselData);
  const commonTags = tags.slice(0, 10).join(' ');
  const title = `${carouselData.title} | Acordes Ocultos`;
  const description = defaultDescription(carouselData);

  const copy = [
    description,
    '',
    commonTags
  ].join('\n');

  const telegramSummary = [
    `<b>🖼️ ${escapeHtml(title)} (Carrusel Grid)</b>`,
    '',
    `<b>Artista:</b> ${escapeHtml(carouselData.artist)}`,
    `<b>Tema:</b> ${escapeHtml(carouselData.topic)}`,
    `<b>Diapositivas:</b> ${escapeHtml(carouselData.slides.length)}`,
    '',
    `<b>Copy Instagram / Facebook</b>`,
    `<pre>${escapeHtml(copy)}</pre>`
  ].join('\n');

  return {
    title,
    artist: carouselData.artist,
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

const writeProductionFiles = (carouselData, editorialPackage) => {
  mkdirSync(packageDir, {recursive: true});
  const slug = slugFor(carouselData.title);
  const packagePath = join(packageDir, `${slug}-package.json`);
  const copyPath = join(packageDir, `${slug}-copys.md`);

  writeFileSync(packagePath, `${JSON.stringify(editorialPackage, null, 2)}\n`);
  writeFileSync(
    copyPath,
    [
      `# ${editorialPackage.title}`,
      '',
      '## Copy Instagram / Facebook',
      '',
      editorialPackage.copy
    ].join('\n')
  );

  return {packagePath, copyPath};
};

const requiredEnv = (keys, integrationName) => {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    return null;
  }
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
};

const normalizeUrl = (value) => String(value).replace(/\/+$/g, '');

const contentTypeFor = (filePath) => {
  const extension = extname(filePath).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.json') return 'application/json';
  if (extension === '.md') return 'text/markdown; charset=utf-8';
  return 'application/octet-stream';
};

const cloudflareConfig = () => {
  return requiredEnv(
    [
      'CLOUDFLARE_R2_ACCOUNT_ID',
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      'CLOUDFLARE_R2_BUCKET'
    ],
    'Cloudflare R2'
  );
};

const uploadToCloudflare = async ({carouselData, files, slidePaths}) => {
  const config = cloudflareConfig();
  if (!config) {
    return {enabled: false, skippedReason: 'Cloudflare R2 env vars are not configured.'};
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: config.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    }
  });

  const slug = slugFor(carouselData.title);
  const publishedAt = new Date().toISOString().replace(/[:.]/g, '-');
  const baseKey = [process.env.CLOUDFLARE_R2_PREFIX || 'acordes-ocultos', slug, publishedAt].filter(Boolean).join('/');
  
  const targets = {
    copy: {path: files.copyPath, key: `${baseKey}/${basename(files.copyPath)}`},
    package: {path: files.packagePath, key: `${baseKey}/${basename(files.packagePath)}`}
  };

  const uploaded = {};
  const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

  for (const [name, target] of Object.entries(targets)) {
    await client.send(
      new PutObjectCommand({
        Bucket: config.CLOUDFLARE_R2_BUCKET,
        Key: target.key,
        Body: readFileSync(target.path),
        ContentType: contentTypeFor(target.path)
      })
    );
    uploaded[name] = {
      key: target.key,
      url: publicUrlBase ? `${normalizeUrl(publicUrlBase)}/${target.key}` : null
    };
  }

  const slidesUploaded = [];
  for (const slidePath of slidePaths) {
    const key = `${baseKey}/carousel/${basename(slidePath)}`;
    await client.send(
      new PutObjectCommand({
        Bucket: config.CLOUDFLARE_R2_BUCKET,
        Key: key,
        Body: readFileSync(slidePath),
        ContentType: contentTypeFor(slidePath)
      })
    );
    slidesUploaded.push({
      src: basename(slidePath),
      key,
      url: publicUrlBase ? `${normalizeUrl(publicUrlBase)}/${key}` : null
    });
  }

  return {
    enabled: true,
    bucket: config.CLOUDFLARE_R2_BUCKET,
    files: uploaded,
    slides: slidesUploaded
  };
};

const supabaseConfig = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!process.env.SUPABASE_URL || !key) {
    return null;
  }
  return {
    url: normalizeUrl(process.env.SUPABASE_URL),
    key,
    table: process.env.SUPABASE_PUBLICATIONS_TABLE || 'published_news'
  };
};

const saveToSupabase = async ({carouselData, editorialPackage, files, slidePaths, cloudflare}) => {
  const config = supabaseConfig();
  if (!config) {
    return {enabled: false, skippedReason: 'Supabase env vars are not configured.'};
  }

  const cloudflareFiles = cloudflare?.enabled ? cloudflare.files : null;
  const cloudflareSlides = cloudflare?.enabled ? cloudflare.slides : null;
  const packageUrl = cloudflareFiles?.package?.url || null;
  const copyUrl = cloudflareFiles?.copy?.url || null;
  
  // Slide 0 is the cover image
  const coverUrl = cloudflareSlides?.[0]?.url || null;

  const publishedNewsRow = {
    source_url: coverUrl || packageUrl,
    title: editorialPackage.title,
    platform: 'instagram_carousel',
    x_published: false,
    ig_published: false,
    web_article: editorialPackage.copy,
    youtube_url: null,
    image_url: coverUrl,
    tiktok_script: null,
    status: 'published',
    production_plan: {
      slug: slugFor(carouselData.title),
      artist: editorialPackage.artist,
      hashtags: editorialPackage.hashtags,
      carousel: carouselData,
      files: {
        local: {
          packagePath: files.packagePath,
          copyPath: files.copyPath,
          slides: slidePaths
        },
        cloudflare: cloudflareFiles,
        slides: cloudflareSlides
      },
      package_url: packageUrl,
      copy_url: copyUrl,
      generated_at: new Date().toISOString()
    },
    video_url: null,
    tweet: null,
    instagram_caption: editorialPackage.copy,
    telegram_published: false
  };

  const response = await fetch(`${config.url}/rest/v1/${config.table}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      'content-type': 'application/json',
      prefer: 'return=representation'
    },
    body: JSON.stringify(publishedNewsRow)
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
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
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
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
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

const main = async () => {
  const options = parseArgs();
  loadEnv(options.env);

  if (!existsSync(options.carousel)) {
    throw new Error(`Carousel JSON not found: ${options.carousel}`);
  }

  const carouselData = JSON.parse(readFileSync(options.carousel, 'utf8'));
  
  // Find all rendered slides in out/carousel
  if (!existsSync(carouselOutDir)) {
    throw new Error(`Carousel out directory not found: ${carouselOutDir}. Run render:carousel first.`);
  }

  const slideFiles = readdirSync(carouselOutDir)
    .filter(f => f.startsWith('element-') && f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('element-', '').replace('.png', ''), 10);
      const numB = parseInt(b.replace('element-', '').replace('.png', ''), 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error(`No rendered slides found in ${carouselOutDir}. Expected slide-0.png, slide-1.png, etc.`);
  }

  const slidePaths = slideFiles.map(f => join(carouselOutDir, f));
  console.log(`Found ${slidePaths.length} slides to publish.`);

  const editorialPackage = buildEditorialPackage(carouselData);
  const files = writeProductionFiles(carouselData, editorialPackage);

  let cloudflare = {enabled: false, skippedReason: 'Dry run.'};
  let supabase = {enabled: false, skippedReason: 'Dry run.'};

  if (!options.dryRun && !options.skipCloudflare) {
    cloudflare = await uploadToCloudflare({
      carouselData,
      files,
      slidePaths
    });
  }

  if (!options.dryRun && !options.skipSupabase) {
    supabase = await saveToSupabase({
      carouselData,
      editorialPackage,
      files,
      slidePaths,
      cloudflare
    });
  }

  if (!options.dryRun && !options.skipTelegram) {
    let summary = editorialPackage.telegramSummary;
    if (cloudflare.enabled && cloudflare.slides?.[0]?.url) {
      summary += `\n\n<b>Lámina de Portada (Cloudflare):</b> <a href="${cloudflare.slides[0].url}">Ver Portada</a>`;
    }
    await sendTelegramMessage(summary);
    await sendTelegramDocument(files.copyPath, 'Copy Instagram / Facebook');
    
    // Send all slides as documents for easy download
    for (const slidePath of slidePaths) {
      await sendTelegramDocument(slidePath, `Slide ${basename(slidePath)}`);
    }
  }

  const result = {
    ok: true,
    dryRun: options.dryRun,
    slidesCount: slidePaths.length,
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
