import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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

  const ADMIN_PASSWORD =
    import.meta.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    '';

  try {
    const body = await request.json();
    const { password, storyId, slug, title, artist, coverUrl } = body || {};

    const cleanPw = (password || '').trim();
    const valid =
      cleanPw === ADMIN_PASSWORD ||
      Buffer.from(cleanPw).toString('base64') === Buffer.from(ADMIN_PASSWORD).toString('base64');

    if (!ADMIN_PASSWORD || !valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contraseña de administrador incorrecta' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!coverUrl || typeof coverUrl !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'La URL de portada es requerida' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
          const cleanArtist = (artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          const match = rows.find((r: any) => {
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
      return new Response(
        JSON.stringify({
          success: false,
          error: `No se encontró "${title || storyId}" en la base de datos de Supabase`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatedFiles = {
      ...(currentPlan.files || {}),
      cloudflare: {
        ...(currentPlan.files?.cloudflare || {}),
        cover: coverUrl
      }
    };

    const updatedPlan = {
      ...currentPlan,
      cover_url: coverUrl,
      files: updatedFiles
    };

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${targetRowId}`, {
      method: 'PATCH',
      headers: { ...headers, prefer: 'return=representation' },
      body: JSON.stringify({
        image_url: coverUrl,
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
        coverUrl
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
