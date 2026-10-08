import type { APIRoute } from 'astro';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { ArchiveImageItem } from '../../lib/types';
import { adminConfig, PRIVATE_HEADERS, sameOrigin, SESSION_COOKIE, validSession } from '../../lib/admin-session';

export const prerender = false;

// Global memory cache with TTL for ultra-fast searches
let cachedItems: ArchiveImageItem[] = [];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!sameOrigin(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Origen no autorizado' }), {
      status: 403,
      headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/json' }
    });
  }
  if (!validSession(cookies.get(SESSION_COOKIE)?.value, adminConfig())) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
      status: 401,
      headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const SUPABASE_URL =
    import.meta.env.SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://dsyxiowlipttwjuhoqio.supabase.co';

  const SUPABASE_KEY =
    import.meta.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  const R2_ACCOUNT_ID =
    import.meta.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    '0c0aad7fd951028fbe9eded107092686';

  const R2_ACCESS_KEY_ID =
    import.meta.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    '';

  const R2_SECRET_ACCESS_KEY =
    import.meta.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    '';

  const R2_BUCKET =
    import.meta.env.CLOUDFLARE_R2_BUCKET ||
    process.env.CLOUDFLARE_R2_BUCKET ||
    'nexo-gaming-news-videos';

  const R2_PUBLIC_URL = (
    import.meta.env.CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev'
  ).replace(/\/$/, '');

  try {
    const body = await request.json().catch(() => ({}));
    const { query = '', type = 'all', refresh = false } = body || {};

    const now = Date.now();
    const shouldRefresh = refresh || cachedItems.length === 0 || now - lastFetchedAt > CACHE_TTL_MS;

    if (shouldRefresh) {
      const itemsMap = new Map<string, ArchiveImageItem>();

      // 1. Fetch from Supabase
      try {
        const headers = {
          apikey: SUPABASE_KEY,
          authorization: `Bearer ${SUPABASE_KEY}`,
          'content-type': 'application/json'
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/published_news?select=id,title,image_url,created_at,production_plan&order=created_at.desc&limit=300`, { headers });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) {
            for (const row of rows) {
              const pp = row.production_plan || {};
              const story = pp.story || {};
              const files = pp.files || {};
              const cloudflare = files.cloudflare || {};
              const title = row.title ? row.title.split('|')[0].trim() : 'Sin título';
              const artist = pp.artist || row.music_artist || '';
              const slug = pp.slug || story.slug || '';
              const date = row.created_at || pp.generated_at || '';

              // 1.A) Cover
              const coverUrl = row.image_url || cloudflare.cover;
              if (coverUrl && typeof coverUrl === 'string' && coverUrl.startsWith('http') && !itemsMap.has(coverUrl)) {
                itemsMap.set(coverUrl, {
                  id: `cover-${row.id}`,
                  url: coverUrl,
                  title: `Portada: ${title}`,
                  artist,
                  storySlug: slug,
                  storyId: String(row.id),
                  type: 'cover',
                  date,
                  source: 'supabase'
                });
              }

              // 1.B) Story Teaser
              const teaserUrl = pp.story_teaser_url || cloudflare.story_teaser;
              if (teaserUrl && typeof teaserUrl === 'string' && teaserUrl.startsWith('http') && !itemsMap.has(teaserUrl)) {
                itemsMap.set(teaserUrl, {
                  id: `teaser-${row.id}`,
                  url: teaserUrl,
                  title: `Avance (Teaser 4-Grid): ${title}`,
                  artist,
                  storySlug: slug,
                  storyId: String(row.id),
                  type: 'teaser',
                  date,
                  source: 'supabase'
                });
              }

              // 1.C) Scenes (1 to 9)
              const scenes = Array.isArray(story.scenes) ? story.scenes : Array.isArray(pp.scenes) ? pp.scenes : [];
              scenes.forEach((sc: any, idx: number) => {
                const sceneUrl = sc.visual_resource?.image_url || sc.image;
                if (sceneUrl && typeof sceneUrl === 'string' && sceneUrl.startsWith('http') && !itemsMap.has(sceneUrl)) {
                  const sceneNum = sc.scene_id || idx + 1;
                  const sceneText = sc.narrative_text || sc.text || '';
                  itemsMap.set(sceneUrl, {
                    id: `scene-${row.id}-${sceneNum}`,
                    url: sceneUrl,
                    title: `${title} - Escena ${sceneNum}`,
                    artist,
                    storySlug: slug,
                    storyId: String(row.id),
                    type: 'scene',
                    sceneNumber: sceneNum,
                    caption: sceneText,
                    date,
                    source: 'supabase'
                  });
                }
              });

              // 1.D) Extra Images attached to story
              if (Array.isArray(pp.extra_images)) {
                pp.extra_images.forEach((ex: any, idx: number) => {
                  if (ex.url && typeof ex.url === 'string' && ex.url.startsWith('http') && !itemsMap.has(ex.url)) {
                    itemsMap.set(ex.url, {
                      id: `extra-${row.id}-${idx}`,
                      url: ex.url,
                      title: ex.caption || `${title} (Foto Extra)`,
                      artist,
                      storySlug: slug,
                      storyId: String(row.id),
                      type: 'extra',
                      caption: ex.caption,
                      credit: ex.credit,
                      date,
                      source: 'supabase'
                    });
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching Supabase image archive:', err);
      }

      // 2. Fetch extra objects from Cloudflare R2 bucket
      try {
        const s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY
          }
        });

        const r2Res = await s3.send(
          new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            MaxKeys: 300
          })
        );

        if (Array.isArray(r2Res.Contents)) {
          for (const item of r2Res.Contents) {
            const key = item.Key || '';
            const lower = key.toLowerCase();
            const isImg = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp');
            if (!isImg) continue;

            const url = `${R2_PUBLIC_URL}/${key}`;
            if (!itemsMap.has(url)) {
              // Infer title and type from key
              let inferredType: 'cover' | 'scene' | 'teaser' | 'extra' | 'file' = 'file';
              if (lower.includes('cover')) inferredType = 'cover';
              else if (lower.includes('scene')) inferredType = 'scene';
              else if (lower.includes('teaser')) inferredType = 'teaser';
              else if (lower.includes('extra-image')) inferredType = 'extra';

              const filename = key.split('/').pop() || key;
              itemsMap.set(url, {
                id: `r2-${key}`,
                url,
                title: filename.replace(/[-_]/g, ' ').replace(/\.[a-z0-9]+$/i, ''),
                type: inferredType,
                date: item.LastModified ? item.LastModified.toISOString() : undefined,
                source: 'r2'
              });
            }
          }
        }
      } catch (err) {
        console.warn('Error listing Cloudflare R2 images:', err);
      }

      cachedItems = Array.from(itemsMap.values());
      lastFetchedAt = now;
    }

    // 3. Filter by query and type
    const q = (query || '').trim().toLowerCase();
    const typeFilter = (type || 'all').toLowerCase();

    let results = cachedItems;

    if (typeFilter !== 'all') {
      results = results.filter(item => item.type === typeFilter);
    }

    if (q) {
      results = results.filter(item => {
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchArtist = (item.artist || '').toLowerCase().includes(q);
        const matchSlug = (item.storySlug || '').toLowerCase().includes(q);
        const matchCaption = (item.caption || '').toLowerCase().includes(q);
        const matchUrl = (item.url || '').toLowerCase().includes(q);
        return matchTitle || matchArtist || matchSlug || matchCaption || matchUrl;
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        items: results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Error en el buscador de imágenes' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
