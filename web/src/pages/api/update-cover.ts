import type { APIRoute } from 'astro';
import { adminConfig, PRIVATE_HEADERS, sameOrigin, SESSION_COOKIE, validSession } from '../../lib/admin-session';
import { clearStoriesCache } from '../../lib/stories';
import { getFromR2, saveToR2 } from '../../lib/r2';
import storiesCatalogFallback from '../../data/stories_catalog.json';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

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

  try {
    const body = await request.json();
    const { storyId, slug, title, coverUrl } = body || {};

    if (!coverUrl || typeof coverUrl !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'La URL de portada es requerida' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Update R2 catalog (primary live source)
    let catalog: any[] = [];
    try {
      const r2Data = await getFromR2<any[]>('catalog/stories_catalog.json');
      if (Array.isArray(r2Data) && r2Data.length > 0) {
        catalog = r2Data;
      }
    } catch (_) {}

    if (catalog.length === 0 && Array.isArray(storiesCatalogFallback)) {
      catalog = JSON.parse(JSON.stringify(storiesCatalogFallback));
    }

    const cleanSlug = (slug || storyId || '').toLowerCase().replace(/^historia-/, '').replace(/[^a-z0-9]/g, '');
    const cleanTitle = (title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');

    const catIdx = catalog.findIndex((item: any) => {
      if (storyId && (item.id === storyId || item.slug === storyId)) return true;
      const iSlug = (item.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const iTitle = (item.title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
      if (cleanSlug && (iSlug === cleanSlug || iSlug.includes(cleanSlug))) return true;
      if (cleanTitle && (iTitle === cleanTitle || iTitle.includes(cleanTitle))) return true;
      return false;
    });

    if (catIdx >= 0) {
      catalog[catIdx].coverUrl = coverUrl;
    }

    let r2Saved = false;
    try {
      const ok1 = await saveToR2('catalog/stories_catalog.json', catalog);
      const ok2 = await saveToR2('acordes-ocultos/catalog/stories_catalog.json', catalog);
      r2Saved = ok1 || ok2;
    } catch (r2Err) {
      console.warn('[update-cover] Error saving to R2:', r2Err);
    }

    // 2. Also update local file if present on disk
    try {
      const possiblePaths = [
        path.resolve(process.cwd(), 'src/data/stories_catalog.json'),
        path.resolve(process.cwd(), 'web/src/data/stories_catalog.json')
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          fs.writeFileSync(p, JSON.stringify(catalog, null, 2), 'utf8');
        }
      }
    } catch (_) {}

    // 3. Best-effort sync to Supabase
    let targetRowId: string | null = null;
    if (SUPABASE_KEY && SUPABASE_URL) {
      try {
        const headers = {
          apikey: SUPABASE_KEY,
          authorization: `Bearer ${SUPABASE_KEY}`,
          'content-type': 'application/json'
        };

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storyId || '');
        if (isUuid) {
          const getRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${storyId}&select=id,production_plan`, { headers });
          if (getRes.ok) {
            const rows = await getRes.json();
            if (Array.isArray(rows) && rows.length > 0) {
              targetRowId = rows[0].id;
              const currentPlan = rows[0].production_plan || {};
              const updatedFiles = {
                ...(currentPlan.files || {}),
                cloudflare: { ...(currentPlan.files?.cloudflare || {}), cover: coverUrl }
              };
              await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${targetRowId}`, {
                method: 'PATCH',
                headers: { ...headers, prefer: 'return=representation' },
                body: JSON.stringify({
                  image_url: coverUrl,
                  production_plan: { ...currentPlan, cover_url: coverUrl, files: updatedFiles }
                })
              });
            }
          }
        }

        if (!targetRowId && (cleanSlug || cleanTitle)) {
          const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?select=id,title,production_plan&order=created_at.desc&limit=100`, { headers });
          if (searchRes.ok) {
            const rows = await searchRes.json();
            if (Array.isArray(rows)) {
              const match = rows.find((r: any) => {
                if (storyId && r.id === storyId) return true;
                const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const rTitle = (r.title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
                if (rSlug && cleanSlug && rSlug === cleanSlug) return true;
                if (rTitle && cleanTitle && rTitle === cleanTitle) return true;
                return false;
              });
              if (match) {
                targetRowId = match.id;
                const currentPlan = match.production_plan || {};
                const updatedFiles = {
                  ...(currentPlan.files || {}),
                  cloudflare: { ...(currentPlan.files?.cloudflare || {}), cover: coverUrl }
                };
                await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${targetRowId}`, {
                  method: 'PATCH',
                  headers: { ...headers, prefer: 'return=representation' },
                  body: JSON.stringify({
                    image_url: coverUrl,
                    production_plan: { ...currentPlan, cover_url: coverUrl, files: updatedFiles }
                  })
                });
              }
            }
          }
        }
      } catch (sbErr: any) {
        console.warn('[update-cover] Supabase sync skipped:', sbErr?.message);
      }
    }

    // 4. Invalidate in-memory cache
    clearStoriesCache();

    return new Response(
      JSON.stringify({
        success: true,
        targetRowId: targetRowId || storyId,
        coverUrl,
        r2Synced: r2Saved
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
