import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse .env file
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match && !process.env[match[1]]) {
          let val = (match[2] || '').trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          process.env[match[1]] = val;
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8'
};

async function handleSetReel(req, res) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'JSON inválido' }));
  }

  const { password, storyId, reelUrl, slug, title, artist } = data;

  // Validate admin password
  const cleanPw = (password || '').trim();
  const valid = cleanPw === ADMIN_PASSWORD || Buffer.from(cleanPw).toString('base64') === Buffer.from(ADMIN_PASSWORD).toString('base64');
  if (!ADMIN_PASSWORD || !valid) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Contraseña de administrador inválida' }));
  }

  try {
    const headers = {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json'
    };

    let targetRowId = null;
    let currentPlan = {};

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storyId || '');

    // 1. If valid UUID, look up directly
    if (isUuid) {
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${storyId}&select=id,production_plan`, { headers });
      if (getRes.ok) {
        const rows = await getRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          targetRowId = rows[0].id;
          currentPlan = rows[0].production_plan || {};
        }
      }
    }

    // 2. Search recent rows by slug, title or artist
    if (!targetRowId) {
      const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?select=id,title,production_plan&order=created_at.desc&limit=300`, { headers });
      if (searchRes.ok) {
        const rows = await searchRes.json();
        if (Array.isArray(rows)) {
          const cleanSlug = (slug || '').replace(/^historia-/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanTitle = (title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
          const cleanArtist = (artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          const match = rows.find(r => {
            if (r.id === storyId) return true;
            const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const rTitle = (r.title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
            const rArtist = (r.production_plan?.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');

            if (rSlug && cleanSlug && (rSlug === cleanSlug || rSlug.includes(cleanSlug) || cleanSlug.includes(rSlug))) return true;
            if (rTitle && cleanTitle && (rTitle.includes(cleanTitle) || cleanTitle.includes(rTitle))) return true;
            if (cleanArtist && rArtist && (cleanArtist.includes(rArtist) || rArtist.includes(cleanArtist))) return true;
            return false;
          });

          if (match) {
            targetRowId = match.id;
            currentPlan = match.production_plan || {};
          }
        }
      }
    }

    if (!targetRowId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: false,
        error: `No se encontró "${title || storyId}" en la base de datos de Supabase`
      }));
    }

    // 3. Patch Supabase
    const updatedPlan = {
      ...currentPlan,
      instagram_reel_url: reelUrl || null
    };

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${targetRowId}`, {
      method: 'PATCH',
      headers: { ...headers, prefer: 'return=representation' },
      body: JSON.stringify({
        production_plan: updatedPlan,
        ig_published: Boolean(reelUrl)
      })
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text().catch(() => '');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: `Error en Supabase: HTTP ${patchRes.status} ${errText}` }));
    }

    console.log(`[Admin] Reel URL actualizada para ${title || targetRowId}: ${reelUrl || '(removido)'}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, targetRowId, reelUrl }));
  } catch (err) {
    console.error('[Admin] Error actualizando reel:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: err.message || 'Error interno del servidor' }));
  }
}

function serveStatic(req, res) {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  let filePath = path.join(DIST_DIR, reqPath);

  // If path doesn't have an extension, check if it's a directory with index.html or if file.html exists
  if (!path.extname(filePath)) {
    if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    } else if (fs.existsSync(`${filePath}.html`)) {
      filePath = `${filePath}.html`;
    }
  }

  // Security check: ensure filePath is inside DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Acceso denegado');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // 404 fallback
    const notFoundPath = path.join(DIST_DIR, '404.html');
    if (fs.existsSync(notFoundPath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(notFoundPath).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Página no encontrada');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
  });
  fs.createReadStream(filePath).pipe(res);
}

async function handleUpdateStory(req, res) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'JSON inválido' }));
  }

  const { password, storyId, slug, title, artist, content, extraImages } = data;
  const cleanPw = (password || '').trim();
  const valid = cleanPw === ADMIN_PASSWORD || Buffer.from(cleanPw).toString('base64') === Buffer.from(ADMIN_PASSWORD).toString('base64');
  if (!ADMIN_PASSWORD || !valid) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Contraseña de administrador inválida' }));
  }

  try {
    const headers = {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json'
    };

    let targetRowId = null;
    let currentPlan = {};
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storyId || '');

    if (isUuid) {
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${storyId}&select=id,production_plan`, { headers });
      if (getRes.ok) {
        const rows = await getRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          targetRowId = rows[0].id;
          currentPlan = rows[0].production_plan || {};
        }
      }
    }

    if (!targetRowId) {
      const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?select=id,title,production_plan&order=created_at.desc&limit=300`, { headers });
      if (searchRes.ok) {
        const rows = await searchRes.json();
        if (Array.isArray(rows)) {
          const cleanSlug = (slug || '').replace(/^historia-/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanTitle = (title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
          const cleanArtist = (artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          const match = rows.find(r => {
            if (r.id === storyId) return true;
            const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const rTitle = (r.title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
            const rArtist = (r.production_plan?.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');

            if (rSlug && cleanSlug && (rSlug === cleanSlug || rSlug.includes(cleanSlug) || cleanSlug.includes(rSlug))) return true;
            if (rTitle && cleanTitle && (rTitle.includes(cleanTitle) || cleanTitle.includes(rTitle))) return true;
            if (cleanArtist && rArtist && (cleanArtist.includes(rArtist) || rArtist.includes(cleanArtist))) return true;
            return false;
          });

          if (match) {
            targetRowId = match.id;
            currentPlan = match.production_plan || {};
          }
        }
      }
    }

    if (!targetRowId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: `No se encontró "${title || storyId}" en Supabase` }));
    }

    const updatedPlan = {
      ...currentPlan,
      custom_article: true,
      extra_images: Array.isArray(extraImages) ? extraImages : (currentPlan.extra_images || [])
    };

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${targetRowId}`, {
      method: 'PATCH',
      headers: { ...headers, prefer: 'return=representation' },
      body: JSON.stringify({
        web_article: content,
        production_plan: updatedPlan
      })
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text().catch(() => '');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: `Error en Supabase: HTTP ${patchRes.status} ${errText}` }));
    }

    console.log(`[Admin] Crónica y fotos actualizadas para ${title || targetRowId}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, targetRowId, extraImages: updatedPlan.extra_images }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: err.message || 'Error interno del servidor' }));
  }
}

async function handleUploadImage(req, res) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'JSON inválido' }));
  }

  const { password, imageBase64, filename, mimeType, storySlug } = data;
  const cleanPw = (password || '').trim();
  const valid = cleanPw === ADMIN_PASSWORD || Buffer.from(cleanPw).toString('base64') === Buffer.from(ADMIN_PASSWORD).toString('base64');
  if (!ADMIN_PASSWORD || !valid) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Contraseña de administrador inválida' }));
  }

  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '0c0aad7fd951028fbe9eded107092686';
    const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
    const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
    const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'nexo-gaming-news-videos';
    const R2_PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev').replace(/\/$/, '');

    let finalMime = mimeType || 'image/jpeg';
    const mimeMatch = (imageBase64 || '').match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    if (mimeMatch) finalMime = mimeMatch[1];

    const rawData = (imageBase64 || '').replace(/^data:[a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+;base64,/, '');
    const buffer = Buffer.from(rawData, 'base64');

    const safeSlug = (storySlug || 'general').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const safeRawName = (filename || 'foto.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const s3Key = `nexo-gaming-news-videos/extra-images/${safeSlug}/${timestamp}-${safeRawName}`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      }
    });

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: finalMime
    }));

    const publicUrl = `${R2_PUBLIC_URL}/${s3Key}`;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, url: publicUrl, key: s3Key }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: err.message || 'Error al subir a Cloudflare R2' }));
  }
}

async function handleUpdateCover(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  let data;
  try { data = JSON.parse(body); } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'JSON inválido' }));
  }
  const { password, storyId, coverUrl } = data;
  const cleanPw = (password || '').trim();
  if (!ADMIN_PASSWORD || (cleanPw !== ADMIN_PASSWORD && Buffer.from(cleanPw).toString('base64') !== Buffer.from(ADMIN_PASSWORD).toString('base64'))) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Contraseña incorrecta' }));
  }
  try {
    const headers = { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json' };
    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${storyId}&select=id,production_plan`, { headers });
    const rows = await getRes.json();
    if (!rows || rows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Historia no encontrada' }));
    }
    const currentPlan = rows[0].production_plan || {};
    const updatedPlan = {
      ...currentPlan,
      cover_url: coverUrl,
      files: { ...(currentPlan.files || {}), cloudflare: { ...(currentPlan.files?.cloudflare || {}), cover: coverUrl } }
    };
    await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${storyId}`, {
      method: 'PATCH',
      headers: { ...headers, prefer: 'return=representation' },
      body: JSON.stringify({ image_url: coverUrl, production_plan: updatedPlan })
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, coverUrl }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

async function handleToggleVisibility(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  let data;
  try { data = JSON.parse(body); } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'JSON inválido' }));
  }
  const { password, storyId, isHidden } = data;
  const cleanPw = (password || '').trim();
  if (!ADMIN_PASSWORD || (cleanPw !== ADMIN_PASSWORD && Buffer.from(cleanPw).toString('base64') !== Buffer.from(ADMIN_PASSWORD).toString('base64'))) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Contraseña incorrecta' }));
  }
  try {
    const headers = { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json' };
    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${storyId}&select=id,production_plan`, { headers });
    const rows = await getRes.json();
    if (!rows || rows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Historia no encontrada' }));
    }
    const currentPlan = rows[0].production_plan || {};
    const nextHidden = Boolean(isHidden);
    const updatedPlan = { ...currentPlan, hidden: nextHidden, is_hidden: nextHidden };
    await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${storyId}`, {
      method: 'PATCH',
      headers: { ...headers, prefer: 'return=representation' },
      body: JSON.stringify({ status: nextHidden ? 'hidden' : 'published', production_plan: updatedPlan })
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, isHidden: nextHidden }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

async function handleSearchImages(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  let data = {};
  try { if (body) data = JSON.parse(body); } catch (e) {}
  const { password, query = '', type = 'all' } = data;
  const cleanPw = (password || '').trim();
  if (!ADMIN_PASSWORD || (cleanPw !== ADMIN_PASSWORD && Buffer.from(cleanPw).toString('base64') !== Buffer.from(ADMIN_PASSWORD).toString('base64'))) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Contraseña incorrecta' }));
  }
  try {
    const headers = { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json' };
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?select=id,title,image_url,created_at,production_plan&order=created_at.desc&limit=300`, { headers });
    const rows = await sbRes.json();
    const items = [];
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const pp = row.production_plan || {};
        const story = pp.story || {};
        const title = row.title ? row.title.split('|')[0].trim() : '';
        const artist = pp.artist || row.music_artist || '';
        const slug = pp.slug || story.slug || '';
        const cover = row.image_url || pp.files?.cloudflare?.cover;
        if (cover) items.push({ id: `cover-${row.id}`, url: cover, title: `Portada: ${title}`, artist, storySlug: slug, type: 'cover' });
        const teaser = pp.story_teaser_url || pp.files?.cloudflare?.story_teaser;
        if (teaser) items.push({ id: `teaser-${row.id}`, url: teaser, title: `Teaser: ${title}`, artist, storySlug: slug, type: 'teaser' });
        const scenes = Array.isArray(story.scenes) ? story.scenes : Array.isArray(pp.scenes) ? pp.scenes : [];
        scenes.forEach((sc, i) => {
          const u = sc.visual_resource?.image_url || sc.image;
          if (u) items.push({ id: `scene-${row.id}-${i+1}`, url: u, title: `${title} - Escena ${i+1}`, artist, storySlug: slug, type: 'scene', sceneNumber: i+1, caption: sc.narrative_text || sc.text });
        });
        if (Array.isArray(pp.extra_images)) {
          pp.extra_images.forEach((ex, i) => {
            if (ex.url) items.push({ id: `extra-${row.id}-${i}`, url: ex.url, title: ex.caption || `${title} (Foto)`, artist, storySlug: slug, type: 'extra', caption: ex.caption, credit: ex.credit });
          });
        }
      }
    }
    const q = (query || '').toLowerCase().trim();
    let filtered = items;
    if (type !== 'all') filtered = filtered.filter(it => it.type === type);
    if (q) filtered = filtered.filter(it => (it.title || '').toLowerCase().includes(q) || (it.artist || '').toLowerCase().includes(q) || (it.caption || '').toLowerCase().includes(q));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, total: filtered.length, items: filtered }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/api/set-reel' && req.method === 'POST') {
    return handleSetReel(req, res);
  }

  if (req.url === '/api/update-story' && req.method === 'POST') {
    return handleUpdateStory(req, res);
  }

  if (req.url === '/api/upload-image' && req.method === 'POST') {
    return handleUploadImage(req, res);
  }

  if (req.url === '/api/update-cover' && req.method === 'POST') {
    return handleUpdateCover(req, res);
  }

  if (req.url === '/api/toggle-visibility' && req.method === 'POST') {
    return handleToggleVisibility(req, res);
  }

  if (req.url === '/api/search-images' && req.method === 'POST') {
    return handleSearchImages(req, res);
  }

  return serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Acordes Ocultos activo en:`);
  console.log(`   - Local:    http://localhost:${PORT}`);
  console.log(`   - Red WiFi: http://10.10.1.40:${PORT}`);
  console.log(`   - Admin:    http://10.10.1.40:${PORT}/admin`);
});
