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
    const { storyId, slug, isHidden } = body || {};

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

    if (!targetRowId && slug) {
      const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?select=id,title,production_plan&order=created_at.desc&limit=300`, { headers });
      if (searchRes.ok) {
        const rows = await searchRes.json();
        if (Array.isArray(rows)) {
          const cleanSlug = (slug || '').replace(/^historia-/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = rows.find((r: any) => {
            const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return Boolean(rSlug && cleanSlug && rSlug === cleanSlug);
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
          error: `No se encontró la publicación en Supabase`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const nextHidden = Boolean(isHidden);
    const updatedPlan = {
      ...currentPlan,
      hidden: nextHidden,
      is_hidden: nextHidden
    };

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${targetRowId}`, {
      method: 'PATCH',
      headers: { ...headers, prefer: 'return=representation' },
      body: JSON.stringify({
        status: nextHidden ? 'hidden' : 'published',
        production_plan: updatedPlan
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
      JSON.stringify({
        success: true,
        targetRowId,
        isHidden: nextHidden
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
