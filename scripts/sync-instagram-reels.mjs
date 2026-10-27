#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

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

async function downloadCatalogFromR2() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || 'nexo-gaming-news-videos';

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    });

    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: 'catalog/stories_catalog.json'
      })
    );
    if (!res.Body) return null;
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

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
        const resObj = parsed.data?.results?.[0]?.response;
        return resObj?.data?.data || resObj?.data_preview?.data || [];
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

  let catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  // 1. Descargar y fusionar el catálogo en vivo desde Cloudflare R2 (preservando ediciones desde Web Admin)
  try {
    const r2Catalog = await downloadCatalogFromR2();
    if (Array.isArray(r2Catalog)) {
      let r2Merged = 0;
      for (const r2Item of r2Catalog) {
        const localMatch = catalog.find(c => c.id === r2Item.id || c.slug === r2Item.slug || (c.articleSlug && c.articleSlug === r2Item.articleSlug));
        if (localMatch) {
          if (r2Item.instagramUrl && r2Item.instagramUrl !== localMatch.instagramUrl) {
            localMatch.instagramUrl = r2Item.instagramUrl;
            r2Merged++;
          }
          if (typeof r2Item.isHidden === 'boolean') localMatch.isHidden = r2Item.isHidden;
          if (r2Item.views && (!localMatch.views || r2Item.views > localMatch.views)) localMatch.views = r2Item.views;
          if (r2Item.reach && (!localMatch.reach || r2Item.reach > localMatch.reach)) localMatch.reach = r2Item.reach;
          if (r2Item.likes && (!localMatch.likes || r2Item.likes > localMatch.likes)) localMatch.likes = r2Item.likes;
        } else if (r2Item.slug) {
          catalog.push(r2Item);
          r2Merged++;
        }
      }
      if (r2Merged > 0) {
        console.log(`🔗 Fusionadas ${r2Merged} actualizaciones en vivo desde Cloudflare R2 (Web Admin).`);
      }
    }
  } catch (err) {
    console.warn('Aviso fusionando R2:', err.message);
  }

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
      // 1. Direct shortcode / URL match (highest confidence)
      if (item.instagramUrl) {
        if (item.instagramUrl === ig.permalink || (ig.shortcode && item.instagramUrl.includes(ig.shortcode))) {
          return true;
        }
      }

      const titleLower = (item.title || '').toLowerCase();
      const songLower = (item.songTitle || '').toLowerCase();
      const artistLower = (item.artist || '').toLowerCase();

      if (songLower && songLower.length >= 4 && captionLower.includes(songLower)) return true;
      if (artistLower && artistLower.length >= 4) {
        const artistParts = artistLower.split(/&|,|\/| y /).map(p => p.trim()).filter(p => p.length >= 4);
        if (captionLower.includes(artistLower) || artistParts.some(p => captionLower.includes(p))) {
          const words = (item.title || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 5);
          if (words.length === 0 || words.some(w => captionLower.includes(w))) return true;
        }
      }
      return false;
    });

    if (match) {
      const changed = match.instagramUrl !== ig.permalink ||
                      match.igPublishedAt !== ig.timestamp ||
                      match.publishedAt !== ig.timestamp ||
                      match.isLatestReel !== isNewest ||
                      match.isHidden;
      if (changed) {
        match.instagramUrl = ig.permalink;
        match.igPublishedAt = ig.timestamp;
        match.publishedAt = ig.timestamp;
        match.isLatestReel = isNewest;
        match.isHidden = false;
        matchedCount++;
        console.log(`✅ [VINCULADO/ACTUALIZADO] "${match.title}" (${match.artist})`);
        console.log(`   URL: ${ig.permalink} | Fecha: ${ig.timestamp}${isNewest ? ' [⚡ ÚLTIMO REEL]' : ''}`);
      }
    }
  }

  // Ensure only the single newest reel has isLatestReel = true
  for (const item of catalog) {
    if (newestItem && (item.instagramUrl === newestItem.permalink || (newestItem.shortcode && item.instagramUrl?.includes(newestItem.shortcode)))) {
      item.isLatestReel = true;
    } else {
      item.isLatestReel = false;
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
