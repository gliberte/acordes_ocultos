#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const rootDir = process.cwd();

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(rootDir, '.env'));
loadEnvFile(path.join(rootDir, 'web', '.env'));

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'ck_5v-DzhM9d_7hffsVXe9x';

async function uploadCatalogToR2(catalog) {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || 'nexo-gaming-news-videos';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('⚠️ [R2] Credenciales no configuradas para Cloudflare R2.');
    return false;
  }

  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    });

    const body = JSON.stringify(catalog, null, 2);
    for (const key of ['catalog/stories_catalog.json', 'acordes-ocultos/catalog/stories_catalog.json']) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: 'application/json'
        })
      );
    }
    console.log('☁️  Catálogo sincronizado exitosamente con Cloudflare R2.');
    return true;
  } catch (err) {
    console.warn('[R2] Error al guardar catálogo en R2:', err.message);
    return false;
  }
}

async function fetchLiveInstagramReels() {
  console.log('📡 Conectando en vivo con Instagram API vía Composio...');
  const res = await fetch('https://connect.composio.dev/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'x-consumer-api-key': COMPOSIO_API_KEY
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'COMPOSIO_MULTI_EXECUTE_TOOL',
        arguments: {
          tools: [{
            tool_slug: 'INSTAGRAM_GET_IG_USER_MEDIA',
            arguments: {
              ig_user_id: 'me',
              limit: 25,
              fields: 'id,shortcode,permalink,timestamp,caption'
            }
          }]
        }
      }
    })
  });

  const text = await res.text();
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      const payload = JSON.parse(line.slice(6));
      const resText = payload.result?.content?.[0]?.text;
      if (resText) {
        const parsed = JSON.parse(resText);
        return parsed.data?.results?.[0]?.response?.data?.data || [];
      }
    }
  }
  return [];
}

async function main() {
  console.log('🔄 ========================================================');
  console.log('📸 SINCRONIZACIÓN PERMANENTE DE REELS DE INSTAGRAM CON LA WEB');
  console.log('🔄 ========================================================\n');

  const catalogPath = path.join(rootDir, 'web', 'src', 'data', 'stories_catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ No se encontró stories_catalog.json');
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const igItems = await fetchLiveInstagramReels();

  if (igItems.length === 0) {
    console.log('⚠️ No se recibieron reels desde la API.');
    return;
  }

  console.log(`✓ Recibidos ${igItems.length} reels más recientes de la cuenta @acordesocultos72.\n`);

  let matchedCount = 0;
  const newestItem = igItems[0];

  for (let i = 0; i < igItems.length; i++) {
    const ig = igItems[i];
    const captionLower = (ig.caption || '').toLowerCase();
    const isNewest = i === 0;

    const match = catalog.find(item => {
      const titleLower = (item.title || '').toLowerCase();
      const songLower = (item.songTitle || '').toLowerCase();
      const artistLower = (item.artist || '').toLowerCase();

      if (songLower && songLower.length >= 4 && captionLower.includes(songLower)) return true;
      if (artistLower && artistLower.length >= 4 && captionLower.includes(artistLower)) {
        // Also check at least one significant word from title or slug
        const words = (item.title || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 5);
        if (words.some(w => captionLower.includes(w))) return true;
      }
      return false;
    });

    if (match) {
      const changed = match.instagramUrl !== ig.permalink || match.isLatestReel !== isNewest;
      if (changed) {
        match.instagramUrl = ig.permalink;
        match.igPublishedAt = ig.timestamp;
        match.isLatestReel = isNewest;
        match.isHidden = false;
        matchedCount++;
        console.log(`✅ [VINCULADO] "${match.title}" (${match.artist})`);
        console.log(`   URL: ${ig.permalink} | Fecha: ${ig.timestamp}${isNewest ? ' [⚡ ÚLTIMO REEL]' : ''}`);
      }
    }
  }

  // Ensure only the single newest reel has isLatestReel = true
  let foundLatest = false;
  for (const item of catalog) {
    if (item.isLatestReel) {
      if (!foundLatest) foundLatest = true;
      else item.isLatestReel = false;
    }
  }

  // Guardar en disco local
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`\n💾 Guardado en web/src/data/stories_catalog.json.`);

  // Subir a Cloudflare R2
  await uploadCatalogToR2(catalog);

  // Auto-commit y push a Git
  try {
    execSync('git add web/src/data/stories_catalog.json', { cwd: rootDir, stdio: 'ignore' });
    const diffCheck = execSync('git diff --cached --name-only', { cwd: rootDir, encoding: 'utf8' }).trim();
    if (diffCheck) {
      console.log('🚀 Desplegando catálogo actualizado a Git/Vercel (origin/main)...');
      execSync('git commit -m "chore(web): permanently sync latest live Instagram Reels to catalog"', { cwd: rootDir, stdio: 'inherit' });
      execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });
      console.log('✅ Despliegue completado con éxito. Los Reels ahora son permanentes en la web.');
    } else {
      console.log('ℹ️ Todos los reels ya estaban sincronizados en Git.');
    }
  } catch (gitErr) {
    console.warn('Aviso git push:', gitErr.message);
  }

  console.log('\n========================================================');
  console.log(`✨ Proceso terminado. ${matchedCount} historias actualizadas.`);
  console.log('========================================================\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
