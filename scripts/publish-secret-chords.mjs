#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const rootDir = process.cwd();
const trackerPath = resolve(rootDir, 'scripts/data/secret_chords_tracker.json');

const s3Client = () => {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || 'nexo-gaming-news-videos';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 is not fully configured in .env');
  }

  return {
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    }),
    bucket,
    publicUrl: (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '')
  };
};

const escapeHtml = (text = '') =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const normalizeTag = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .trim();

function buildCleanCopy(story) {
  const title = story.title?.trim() || '';
  const body = (story.anecdote || '').trim();
  const outro = (story.outro || '').trim();

  // Tags en inglés
  const artistTag = normalizeTag(story.artist || '');
  const songTag = normalizeTag(story.music?.title || '');
  const tags = [
    `#${artistTag}`,
    `#${songTag}`,
    '#SecretChords',
    '#RockHistory',
    '#ClassicRock',
    '#MusicLegends'
  ].filter(t => t.length > 1);

  const fullBody = outro ? `${body}\n\n${outro}` : body;

  return `${title}\n\n${fullBody}\n\n${tags.join(' ')}`;
}

async function uploadToR2(s3, localPath, r2Key, contentType) {
  const localSize = statSync(localPath).size;
  try {
    const head = await s3.client.send(new HeadObjectCommand({ Bucket: s3.bucket, Key: r2Key }));
    if (head.ContentLength === localSize) {
      console.log(`  ⏭️  [Ya en R2] ${r2Key} (${(localSize / (1024 * 1024)).toFixed(1)} MB)`);
      return `${s3.publicUrl}/${r2Key}`;
    }
  } catch (_) {}

  console.log(`  ⬆️  [Subiendo a R2] ${r2Key} (${(localSize / (1024 * 1024)).toFixed(1)} MB)...`);
  const fileContent = readFileSync(localPath);
  await s3.client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: r2Key,
      Body: fileContent,
      ContentType: contentType
    })
  );
  console.log(`  ✅ [Completado R2] ${r2Key}`);
  return `${s3.publicUrl}/${r2Key}`;
}

async function sendTelegramMessage(token, chatId, text, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function sendTelegramDocument(token, chatId, filePath, caption) {
  const form = new FormData();
  const file = new Blob([readFileSync(filePath)], { type: 'application/octet-stream' });
  form.append('chat_id', chatId);
  form.append('caption', caption);
  form.append('document', file, basename(filePath));

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: form
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram sendDocument failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

export async function publishSecretChordsItem(item, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId || process.env.TELEGRAM_CHAT_ID_EN || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('Faltan credenciales de Telegram (TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID_EN o TELEGRAM_CHAT_ID en .env)');
  }

  // Cargar story JSON
  const jsonCandidates = [
    resolve(rootDir, `src/data/generated/secret-chords/${item.slug_en.replace('-secret-chords', '')}.json`),
    resolve(rootDir, `src/data/generated/secret-chords/${item.artist.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.song.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`)
  ];

  let story = null;
  for (const candidate of jsonCandidates) {
    if (existsSync(candidate)) {
      story = JSON.parse(readFileSync(candidate, 'utf8'));
      break;
    }
  }

  if (!story) {
    throw new Error(`No se encontró el archivo JSON para ${item.artist} - ${item.song}`);
  }

  // Rutas de archivos
  const videoLocal = resolve(rootDir, item.video_path_en);
  const outDir = resolve(rootDir, item.video_path_en, '..');
  const coverLocal = join(outDir, 'cover.png');
  const teaserLocal = join(outDir, 'story_teaser.png');

  if (!existsSync(videoLocal)) {
    throw new Error(`El video master no existe en: ${videoLocal}`);
  }

  console.log(`\n======================================================`);
  console.log(`📦 Preparando paquete: ${item.artist} — "${item.song}"`);
  console.log(`🎬 Video: ${videoLocal} (${(statSync(videoLocal).size / (1024 * 1024)).toFixed(1)} MB)`);
  console.log(`======================================================`);

  const cleanCopy = buildCleanCopy(story);

  let videoR2Url = null;
  let coverR2Url = null;
  let teaserR2Url = null;

  if (!options.dryRun) {
    const s3 = s3Client();
    const folderSlug = item.slug_en;

    console.log(`☁️  Subiendo activos a Cloudflare R2 (secret-chords/${folderSlug})...`);
    videoR2Url = await uploadToR2(s3, videoLocal, `secret-chords/${folderSlug}/video_reels_90s_master.mp4`, 'video/mp4');
    console.log(`  ✅ Video Master R2: ${videoR2Url}`);

    if (existsSync(coverLocal)) {
      coverR2Url = await uploadToR2(s3, coverLocal, `secret-chords/${folderSlug}/cover.png`, 'image/png');
      console.log(`  ✅ Cover R2: ${coverR2Url}`);
    }

    if (existsSync(teaserLocal)) {
      teaserR2Url = await uploadToR2(s3, teaserLocal, `secret-chords/${folderSlug}/story_teaser.png`, 'image/png');
      console.log(`  ✅ Teaser R2: ${teaserR2Url}`);
    }

    console.log(`📲 Despachando a Telegram (Chat ID: ${chatId})...`);

    // 1. Mensaje con el Copy limpio en bloque monoespaciado (en Telegram, tocar el bloque copia TODO automáticamente)
    const messageText = [
      `🎸 <b>SECRET CHORDS — REEL READY</b>`,
      `<b>${escapeHtml(item.artist)} — «${escapeHtml(item.song)}»</b>`,
      `<i>${escapeHtml(item.title_en)}</i>`,
      '',
      `📋 <b>COPY PARA INSTAGRAM (Toca el texto abajo para copiar con 1 toque):</b>`,
      `<pre>${escapeHtml(cleanCopy)}</pre>`
    ].join('\n');

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '🎬 Descargar Video Master 1080p (R2)',
            url: videoR2Url
          }
        ]
      ]
    };

    await sendTelegramMessage(token, chatId, messageText, replyMarkup);

    // 2. Documentos de Portada y Teaser
    if (existsSync(coverLocal)) {
      await sendTelegramDocument(token, chatId, coverLocal, `🖼️ Cover — ${item.artist} - ${item.song}`);
    }
    if (existsSync(teaserLocal)) {
      await sendTelegramDocument(token, chatId, teaserLocal, `🎞️ Stories Teaser — ${item.artist} - ${item.song}`);
    }

    console.log(`✅ ¡Paquete enviado a Telegram exitosamente!`);

    // Actualizar tracker
    try {
      const allItems = JSON.parse(readFileSync(trackerPath, 'utf8'));
      const tIdx = allItems.findIndex(i => i.id === item.id);
      if (tIdx >= 0) {
        allItems[tIdx].r2_video_url = videoR2Url;
        allItems[tIdx].telegram_sent = true;
        allItems[tIdx].telegram_sent_at = new Date().toISOString();
        writeFileSync(trackerPath, JSON.stringify(allItems, null, 2), 'utf8');
      }
    } catch (_) {}
  } else {
    console.log(`[DRY RUN] Copy resultante:\n---\n${cleanCopy}\n---`);
  }

  return {
    ok: true,
    artist: item.artist,
    song: item.song,
    videoR2Url,
    cleanCopy
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const allReady = args.includes('--all-ready');
  const idArg = args.find(a => a.startsWith('--id='))?.split('=')[1];
  const chatIdArg = args.find(a => a.startsWith('--chat-id='))?.split('=')[1];

  const items = JSON.parse(readFileSync(trackerPath, 'utf8'));

  let targets = [];
  if (allReady) {
    targets = items.filter(i => i.status === 'rendered');
  } else if (idArg) {
    const item = items.find(i => i.id === idArg || i.slug_en === idArg || i.artist.toLowerCase().includes(idArg.toLowerCase()));
    if (!item) {
      console.error(`❌ No se encontró el episodio: ${idArg}`);
      process.exit(1);
    }
    targets = [item];
  } else {
    console.log(`Uso:
  node scripts/publish-secret-chords.mjs --all-ready [--chat-id=<id>] [--dry-run]
  node scripts/publish-secret-chords.mjs --id=SC-001 [--chat-id=<id>] [--dry-run]
`);
    process.exit(0);
  }

  for (const item of targets) {
    try {
      await publishSecretChordsItem(item, { dryRun, chatId: chatIdArg });
    } catch (err) {
      console.error(`❌ Error al publicar ${item.artist}: ${err.message}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
