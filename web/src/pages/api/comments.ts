import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

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

// GET: Return comments for a story
export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  if (!slug) {
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

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const row = data.find((r: any) => {
      const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return rSlug === cleanSlug || rSlug.includes(cleanSlug) || cleanSlug.includes(rSlug);
    });

    const comments = (row?.production_plan?.social?.comments || []).filter((c: any) => c.status !== 'rejected');

    return new Response(JSON.stringify({ success: true, comments }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ comments: [], error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Add a new comment
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { slug, author, content } = body || {};

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanAuthor = sanitize(author || 'Melómano Anónimo');
    const cleanContent = sanitize(content || '');

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

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const row = data.find((r: any) => {
      const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return rSlug === cleanSlug || rSlug.includes(cleanSlug) || cleanSlug.includes(rSlug);
    });

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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Admin moderation to remove/hide a comment
export const DELETE: APIRoute = async ({ request }) => {
  const ADMIN_PASSWORD =
    import.meta.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    '';

  try {
    const body = await request.json();
    const { slug, commentId, password } = body || {};

    const cleanPw = (password || '').trim();
    if (!ADMIN_PASSWORD || cleanPw !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data } = await supabase
      .from('published_news')
      .select('id, production_plan');

    const cleanSlug = (slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const row = data?.find((r: any) => {
      const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return rSlug === cleanSlug || rSlug.includes(cleanSlug) || cleanSlug.includes(rSlug);
    });

    if (!row) {
      return new Response(JSON.stringify({ error: 'Story not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentPlan = row.production_plan || {};
    const social = currentPlan.social || {};
    const comments = (social.comments || []).filter((c: any) => c.id !== commentId);

    await supabase
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
