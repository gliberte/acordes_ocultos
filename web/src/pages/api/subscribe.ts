import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { allowPublicAction, getClientKey, sameOrigin } from '../../lib/admin-session';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origen de solicitud no autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!allowPublicAction(getClientKey(request, 'subscribe'), 8, 10 * 60_000)) {
    return new Response(JSON.stringify({ error: 'Demasiados intentos. Por favor espera unos minutos.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.length > 2048) {
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

    const {
      email,
      source = 'web_story',
      privacyPolicyConsent,
      minorsDeclaration,
      consentVersion = '2026-10',
      purpose = 'newsletter_editorial'
    } = body || {};

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || cleanEmail.length > 254 || !emailRegex.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Por favor introduce un correo electrónico válido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (privacyPolicyConsent !== true || minorsDeclaration !== 'over_14_years') {
      return new Response(
        JSON.stringify({
          error: 'Debes aceptar expresamente la Política de Privacidad y declarar que tienes 14 años o más.'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const cleanSource = String(source || 'web_story').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'web_story';
    const cleanVersion = String(consentVersion || '2026-10').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 32) || '2026-10';
    const cleanPurpose = String(purpose || 'newsletter_editorial').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'newsletter_editorial';

    // Find system subscribers row
    const { data: rows, error: selectError } = await supabase
      .from('published_news')
      .select('id, production_plan')
      .eq('title', '__system_subscribers__');

    if (selectError) {
      return new Response(JSON.stringify({ error: 'No se pudo verificar el registro de suscriptores.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const nowIso = new Date().toISOString();

    const newSubscriber = {
      email: cleanEmail,
      createdAt: nowIso,
      source: cleanSource,
      privacyPolicyConsent: true,
      minorsDeclaration: 'over_14_years',
      consentVersion: cleanVersion,
      purpose: cleanPurpose,
      consentTimestamp: nowIso
    };

    if (systemRow) {
      const currentPlan = systemRow.production_plan || {};
      const subscribers = Array.isArray(currentPlan.subscribers) ? currentPlan.subscribers : [];

      const exists = subscribers.some((s: any) => s.email === cleanEmail);
      if (!exists) {
        const updatedSubscribers = [newSubscriber, ...subscribers];
        const { error: updateError } = await supabase
          .from('published_news')
          .update({
            production_plan: {
              ...currentPlan,
              subscribers: updatedSubscribers
            }
          })
          .eq('id', systemRow.id);

        if (updateError) {
          return new Response(JSON.stringify({ error: 'No se pudo guardar tu suscripción. Intenta nuevamente.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    } else {
      // Create new system row
      const { error: insertError } = await supabase
        .from('published_news')
        .insert({
          title: '__system_subscribers__',
          platform: 'system',
          status: 'hidden',
          production_plan: {
            subscribers: [newSubscriber]
          }
        });

      if (insertError) {
        return new Response(JSON.stringify({ error: 'No se pudo inicializar el registro de suscripción.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
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
    return new Response(JSON.stringify({ error: 'Error interno al procesar la suscripción' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
