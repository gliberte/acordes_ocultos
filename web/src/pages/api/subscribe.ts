import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, source = 'web_story' } = body || {};

    const cleanEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Por favor introduce un correo electrónico válido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find system subscribers row
    const { data: rows } = await supabase
      .from('published_news')
      .select('id, production_plan')
      .eq('title', '__system_subscribers__');

    const systemRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    const newSubscriber = {
      email: cleanEmail,
      createdAt: new Date().toISOString(),
      source,
      privacyPolicyConsent: true,
      minorsDeclaration: 'over_14_years',
      consentTimestamp: new Date().toISOString()
    };

    if (systemRow) {
      const currentPlan = systemRow.production_plan || {};
      const subscribers = Array.isArray(currentPlan.subscribers) ? currentPlan.subscribers : [];

      const exists = subscribers.some((s: any) => s.email === cleanEmail);
      if (!exists) {
        subscribers.unshift(newSubscriber);
        await supabase
          .from('published_news')
          .update({
            production_plan: {
              ...currentPlan,
              subscribers
            }
          })
          .eq('id', systemRow.id);
      }
    } else {
      // Create new system row
      await supabase
        .from('published_news')
        .insert({
          title: '__system_subscribers__',
          platform: 'system',
          status: 'hidden',
          production_plan: {
            subscribers: [newSubscriber]
          }
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '¡Bienvenido a la comunidad de Acordes Ocultos!',
        substackUrl: `https://acordesocultos.substack.com`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
