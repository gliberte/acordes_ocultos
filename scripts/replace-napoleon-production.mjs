#!/usr/bin/env node
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

// 1. Cargar variables de entorno
const loadEnvFile = (p) => {
  if (!existsSync(p)) return;
  const lines = readFileSync(p, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(join(rootDir, '.env'));
loadEnvFile(join(rootDir, 'web/.env'));

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY;

const r2Config = {
  accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  bucket: process.env.CLOUDFLARE_R2_BUCKET || 'nexo-gaming-news-videos',
  publicUrl: (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev').replace(/\/+$/, ''),
  prefix: (process.env.CLOUDFLARE_R2_PREFIX || 'nexo-gaming-news-videos').replace(/^\/+|\/+$/g, '')
};

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey
  }
});

async function main() {
  console.log('🏛️  ========================================================================');
  console.log('🏛️  REEMPLAZO DE PRODUCCIÓN: JOSÉ MARÍA NAPOLEÓN - "VIVE" (FISONOMÍA REAL)');
  console.log('🏛️  ========================================================================\n');

  // Rutas de archivos corregidos
  const vaultDir = '/Users/luissolano/Library/CloudStorage/GoogleDrive-luis.solano.l@gmail.com/Mi unidad/Acordes Ocultos - Bóveda Maestra/01_Episodios_Completados/jose-maria-napoleon-vive';
  const publicDir = join(rootDir, 'public/videos/jose-maria-napoleon-vive-acordes-ocultos');
  const storyJsonPath = join(rootDir, 'src/data/generated/jose-maria-napoleon-vive-acordes-ocultos.json');
  const copysPath = join(publicDir, 'copys.md');

  if (!existsSync(vaultDir)) {
    throw new Error(`No se encontró la carpeta en la bóveda: ${vaultDir}`);
  }

  const storyData = JSON.parse(readFileSync(storyJsonPath, 'utf8'));
  const copysContent = readFileSync(copysPath, 'utf8');

  // Extraer el copy de Instagram
  const igCopyMatch = copysContent.match(/## 📸 1\. COPY PARA INSTAGRAM REELS[^\n]*\n+([\s\S]*?)(?=\n+---|\n+## 🎵 2\. COPY PARA TIKTOK|$)/);
  const instagramCaption = igCopyMatch ? igCopyMatch[1].trim() : copysContent;

  const reelsVideoPath = join(vaultDir, 'video_reels_90s_master.mp4');
  const tiktokVideoPath = join(vaultDir, 'video_tiktok_60s_master.mp4');
  const coverPath = join(publicDir, 'cover.png');
  const teaserPath = join(publicDir, 'story_teaser.png');

  console.log('📂 Verificando archivos corregidos locales...');
  console.log(`   - Video Reels 90s: ${reelsVideoPath} (${(statSync(reelsVideoPath).size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`   - Video TikTok 60s: ${tiktokVideoPath} (${(statSync(tiktokVideoPath).size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`   - Cover: ${coverPath} (${(statSync(coverPath).size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`   - Story Teaser: ${teaserPath} (${(statSync(teaserPath).size / (1024 * 1024)).toFixed(2)} MB)`);

  // Clave base en Cloudflare R2 con marca de fecha única de la versión corregida
  const timestamp = '2026-09-18T08-18-00-000Z';
  const slug = 'laverguenzaquecreounhimno';
  const baseKey = `${r2Config.prefix}/${slug}/${timestamp}`;

  console.log(`\n☁️  Subiendo nuevos activos a Cloudflare R2: ${baseKey}...`);

  // 1. Subir videos principales
  console.log('   ⬆️  Subiendo story.mp4 (Reels 90s)...');
  await s3Client.send(new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: `${baseKey}/story.mp4`,
    Body: readFileSync(reelsVideoPath),
    ContentType: 'video/mp4'
  }));

  console.log('   ⬆️  Subiendo story_tiktok.mp4 (TikTok 60s)...');
  await s3Client.send(new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: `${baseKey}/story_tiktok.mp4`,
    Body: readFileSync(tiktokVideoPath),
    ContentType: 'video/mp4'
  }));

  // 2. Subir cover y teaser
  console.log('   ⬆️  Subiendo cover.png...');
  await s3Client.send(new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: `${baseKey}/cover.png`,
    Body: readFileSync(coverPath),
    ContentType: 'image/png'
  }));

  console.log('   ⬆️  Subiendo story_teaser.png...');
  await s3Client.send(new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: `${baseKey}/story_teaser.png`,
    Body: readFileSync(teaserPath),
    ContentType: 'image/png'
  }));

  console.log('   ⬆️  Subiendo laverguenzaquecreounhimno-copys.md...');
  await s3Client.send(new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: `${baseKey}/laverguenzaquecreounhimno-copys.md`,
    Body: Buffer.from(copysContent, 'utf8'),
    ContentType: 'text/markdown; charset=utf-8'
  }));

  // 3. Subir las 9 escenas corregidas con fisonomía real
  console.log('   ⬆️  Subiendo las 9 escenas con fisonomía real a assets/...');
  const assetUrls = [];
  for (let i = 1; i <= 9; i++) {
    const sceneName = `scene-0${i}.png`;
    const localScenePath = join(publicDir, sceneName);
    const assetKey = `${baseKey}/assets/${sceneName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: assetKey,
      Body: readFileSync(localScenePath),
      ContentType: 'image/png'
    }));
    assetUrls.push(`${r2Config.publicUrl}/${assetKey}`);
    console.log(`      ✅ assets/${sceneName}`);
  }

  const newVideoUrl = `${r2Config.publicUrl}/${baseKey}/story.mp4`;
  const newVideoTiktokUrl = `${r2Config.publicUrl}/${baseKey}/story_tiktok.mp4`;
  const newCoverUrl = `${r2Config.publicUrl}/${baseKey}/cover.png`;
  const newTeaserUrl = `${r2Config.publicUrl}/${baseKey}/story_teaser.png`;
  const newCopyUrl = `${r2Config.publicUrl}/${baseKey}/laverguenzaquecreounhimno-copys.md`;

  console.log('\n✅ Todos los archivos corregidos fueron subidos a Cloudflare R2.');
  console.log(`   🔗 Video Reels: ${newVideoUrl}`);
  console.log(`   🔗 Video TikTok: ${newVideoTiktokUrl}`);
  console.log(`   🔗 Cover: ${newCoverUrl}`);

  // 4. Actualizar registro en Supabase
  const rowId = 'a3304b1c-0712-4732-ae10-389b47c46469';
  console.log(`\n📡 Actualizando registro ${rowId} en Supabase (published_news)...`);

  const updatedProductionPlan = {
    slug,
    artist: storyData.artist,
    duration_seconds: 90,
    music: storyData.music,
    instagram_music: storyData.music?.instagram,
    hashtags: [
      '#JoseMariaNapoleon',
      '#Vive',
      '#AcordesOcultos',
      '#HistoriaDeLaMusica',
      '#FestivalOTI',
      '#BaladaEnEspanol',
      '#MusicaMexicana'
    ],
    story: storyData,
    files: {
      cloudflare: {
        video: { key: `${baseKey}/story.mp4`, url: newVideoUrl },
        video_tiktok: { key: `${baseKey}/story_tiktok.mp4`, url: newVideoTiktokUrl },
        cover: { key: `${baseKey}/cover.png`, url: newCoverUrl },
        story_teaser: { key: `${baseKey}/story_teaser.png`, url: newTeaserUrl },
        copy: { key: `${baseKey}/laverguenzaquecreounhimno-copys.md`, url: newCopyUrl }
      },
      assets: assetUrls
    },
    copy_url: newCopyUrl,
    story_teaser_url: newTeaserUrl,
    video_size_bytes: statSync(reelsVideoPath).size,
    generated_at: new Date().toISOString()
  };

  const patchBody = {
    source_url: newVideoUrl,
    video_url: newVideoUrl,
    image_url: newCoverUrl,
    web_article: instagramCaption,
    instagram_caption: instagramCaption,
    production_plan: updatedProductionPlan
  };

  const patchRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${rowId}`, {
    method: 'PATCH',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(patchBody)
  });

  if (!patchRes.ok) {
    const errText = await patchRes.text();
    throw new Error(`Error al actualizar Supabase: HTTP ${patchRes.status} - ${errText}`);
  }

  const updatedRows = await patchRes.json();
  console.log(`✅ Registro actualizado exitosamente en Supabase (Filas afectadas: ${updatedRows.length})`);

  // 5. Eliminar archivos obsoletos anteriores en Cloudflare R2
  const oldBaseKey = 'nexo-gaming-news-videos/laverguenzaquecreounhimno/2026-09-14T20-55-01-316Z';
  console.log(`\n🧹 Limpiando versión obsoleta previa en R2 (${oldBaseKey})...`);
  const oldKeys = [
    `${oldBaseKey}/story.mp4`,
    `${oldBaseKey}/story_tiktok.mp4`,
    `${oldBaseKey}/cover.png`,
    `${oldBaseKey}/story_teaser.png`,
    `${oldBaseKey}/laverguenzaquecreounhimno-copys.md`,
    `${oldBaseKey}/laverguenzaquecreounhimno-package.json`,
    ...Array.from({ length: 9 }, (_, i) => `${oldBaseKey}/assets/scene-0${i + 1}.png`)
  ];

  try {
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: r2Config.bucket,
      Delete: {
        Objects: oldKeys.map(Key => ({ Key }))
      }
    }));
    console.log(`✅ ${oldKeys.length} objetos obsoletos eliminados de Cloudflare R2.`);
  } catch (delErr) {
    console.warn(`⚠️ Advertencia al limpiar objetos viejos: ${delErr.message}`);
  }

  console.log('\n🎉 ¡PROCESO FINALIZADO CON ÉXITO!');
  console.log('   La versión corregida con fisonomía real de José María Napoleón "Vive" ha reemplazado completamente la anterior en Cloudflare R2 y Supabase.');
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err);
  process.exit(1);
});
