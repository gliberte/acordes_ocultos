import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { adminConfig, allowPublicAction, getClientKey, sameOrigin, SESSION_COOKIE, validSession } from '../../lib/admin-session';

export const prerender = false;

function sanitize(text: string): string {
  return (text || '')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function normalizeCommentSlug(val: string): string {
  return (val || '').replace(/^historia-/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchesStorySlug(row: any, cleanSlug: string): boolean {
  if (!cleanSlug) return false;
  const plan = row?.production_plan;
  if (!plan || typeof plan !== 'object') return false;
  const rSlug = normalizeCommentSlug(plan.slug || plan.story?.slug || '');
  const rArticleSlug = normalizeCommentSlug(plan.articleSlug || plan.story?.articleSlug || '');
  if (!rSlug && !rArticleSlug) return false;
  return rSlug === cleanSlug || rArticleSlug === cleanSlug;
}

// GET: Return comments for a story
export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  const cleanSlug = normalizeCommentSlug(slug || '');
  if (!cleanSlug || cleanSlug.length > 120) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { data, error } = await supabase
      .from('published_news')
      .select('id, production_plan')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return new Response(JSON.stringify({ comments: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const row = data.find((r: any) => matchesStorySlug(r, cleanSlug));

    const comments = (row?.production_plan?.social?.comments || []).filter((c: any) => c.status !== 'rejected');

    return new Response(JSON.stringify({ success: true, comments }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ comments: [], error: 'Error al consultar comentarios' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Add a new comment
export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origen no autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!allowPublicAction(getClientKey(request, 'comments_post'), 6, 5 * 60_000)) {
    return new Response(JSON.stringify({ error: 'Demasiados comentarios enviados recientemente. Espera unos minutos.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.length > 4096) {
      return new Response(JSON.stringify({ error: 'Solicitud inválida o demasiado extensa' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Formato JSON inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { slug, author, content } = body || {};
    const cleanSlug = normalizeCommentSlug(typeof slug === 'string' ? slug : '');

    if (!cleanSlug || cleanSlug.length < 2 || cleanSlug.length > 120) {
      return new Response(JSON.stringify({ error: 'Slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanAuthor = sanitize(typeof author === 'string' && author.trim() ? author : 'Melómano Anónimo');
    const cleanContent = sanitize(typeof content === 'string' ? content : '');

    if (cleanAuthor.length < 2 || cleanAuthor.length > 60) {
      return new Response(JSON.stringify({ error: 'El nombre debe tener entre 2 y 60 caracteres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (cleanContent.length < 3 || cleanContent.length > 1500) {
      return new Response(JSON.stringify({ error: 'El comentario debe tener entre 3 y 1500 caracteres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase
      .from('published_news')
      .select('id, production_plan')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Story not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const row = data.find((r: any) => matchesStorySlug(r, cleanSlug));

    if (!row) {
      return new Response(JSON.stringify({ error: 'Story not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentPlan = row.production_plan || {};
    const social = currentPlan.social || {};
    const existingComments = Array.isArray(social.comments) ? social.comments : [];

    const newComment = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      author: cleanAuthor,
      content: cleanContent,
      createdAt: new Date().toISOString(),
      status: 'approved'
    };

    const updatedComments = [newComment, ...existingComments];

    const updatedPlan = {
      ...currentPlan,
      social: {
        ...social,
        comments: updatedComments
      }
    };

    const { error: updateError } = await supabase
      .from('published_news')
      .update({ production_plan: updatedPlan })
      .eq('id', row.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, comment: newComment }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Error al publicar el comentario' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Admin moderation to remove/hide a comment
export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!sameOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origen no autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!validSession(cookies.get(SESSION_COOKIE)?.value, adminConfig())) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { slug, commentId } = body || {};
    const cleanSlug = normalizeCommentSlug(typeof slug === 'string' ? slug : '');

    if (!cleanSlug || !commentId) {
      return new Response(JSON.stringify({ error: 'Slug y commentId requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error: selectError } = await supabase
      .from('published_news')
      .select('id, production_plan');

    if (selectError || !data) {
      return new Response(JSON.stringify({ error: 'No se pudo consultar la historia' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const row = data.find((r: any) => matchesStorySlug(r, cleanSlug));

    if (!row) {
      return new Response(JSON.stringify({ error: 'Story not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentPlan = row.production_plan || {};
    const social = currentPlan.social || {};
    const comments = (social.comments || []).filter((c: any) => c.id !== commentId);

    const { error: updateError } = await supabase
      .from('published_news')
      .update({
        production_plan: {
          ...currentPlan,
          social: {
            ...social,
            comments
          }
        }
      })
      .eq('id', row.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'No se pudo eliminar el comentario' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Error interno al moderar comentario' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
