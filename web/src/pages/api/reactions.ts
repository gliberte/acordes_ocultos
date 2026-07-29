import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { getAllStories } from '../../lib/stories';

export const prerender = false;

// GET: Return current reaction count for a story
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
      return new Response(JSON.stringify({ likes: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const row = data.find((r: any) => {
      const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return rSlug === cleanSlug || rSlug.includes(cleanSlug) || cleanSlug.includes(rSlug);
    });

    const likes = row?.production_plan?.social?.likes || 0;

    return new Response(JSON.stringify({ success: true, likes }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ likes: 0, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Increment or decrement reaction count
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { slug, action = 'like' } = body || {};

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug is required' }), {
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
    const currentLikes = typeof social.likes === 'number' ? social.likes : 0;
    const newLikes = Math.max(0, action === 'unlike' ? currentLikes - 1 : currentLikes + 1);

    const updatedPlan = {
      ...currentPlan,
      social: {
        ...social,
        likes: newLikes
      }
    };

    const { error: updateError } = await supabase
      .from('published_news')
      .update({ production_plan: updatedPlan })
      .eq('id', row.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, likes: newLikes }), {
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
