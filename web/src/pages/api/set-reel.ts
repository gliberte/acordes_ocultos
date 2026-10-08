import type { APIRoute } from 'astro';
import { adminConfig, PRIVATE_HEADERS, sameOrigin, SESSION_COOKIE, validSession } from '../../lib/admin-session';

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
    const { storyId, reelUrl, slug, title } = body || {};

    const headers = {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json'
    };

    let targetRowId: string | null = null;
    let currentPlan: any = {};

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
            currentPlan = match.production_plan || {};
          }
        }
      }
    }

    if (!targetRowId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No se encontró "${title || storyId}" en la base de datos de Supabase`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const updatedPlan = {
      ...currentPlan,
      instagram_reel_url: reelUrl || null,
      ig_published_at: reelUrl ? (currentPlan.ig_published_at || now) : null,
      is_latest_reel: Boolean(reelUrl)
    };

    // If setting a reel, clear is_latest_reel from any older stories in Supabase
    if (reelUrl) {
      try {
        const oldLatestRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?production_plan->>is_latest_reel=eq.true&select=id,production_plan`, { headers });
        if (oldLatestRes.ok) {
          const oldRows = await oldLatestRes.json();
          for (const oldRow of oldRows) {
            if (oldRow.id !== targetRowId) {
              const cleanedPlan = { ...(oldRow.production_plan || {}), is_latest_reel: false };
              await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${oldRow.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ production_plan: cleanedPlan })
              });
            }
          }
        }
      } catch (e) {
        // Non-fatal
      }
    }

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
      return new Response(
        JSON.stringify({ success: false, error: `Error en Supabase: HTTP ${patchRes.status} ${errText}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, targetRowId, reelUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
