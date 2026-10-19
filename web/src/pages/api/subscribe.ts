import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { saveToR2, getFromR2 } from '../../lib/r2';
import { allowPublicAction, getClientKey, sameOrigin } from '../../lib/admin-session';
import initialSubscribers from '../../data/subscribers.json';

export const prerender = false;

interface SubscriberRecord {
  id?: string;
  email: string;
  source: string;
  country?: string | null;
  privacy_policy_consent: boolean;
  minors_declaration: string;
  consent_version: string;
  purpose: string;
  consent_timestamp: string;
  status: string;
  created_at?: string;
  updated_at: string;
}

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

    const nowIso = new Date().toISOString();
    const rawCountry = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || '';
    const cleanCountry = rawCountry.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 2) || null;

    const newSubscriber: SubscriberRecord = {
      email: cleanEmail,
      source: cleanSource,
      country: cleanCountry,
      privacy_policy_consent: true,
      minors_declaration: 'over_14_years',
      consent_version: cleanVersion,
      purpose: cleanPurpose,
      consent_timestamp: nowIso,
      status: 'active',
      updated_at: nowIso
    };

    // 1. Guardar de forma persistente en Cloudflare R2 (subscribers/subscribers.json)
    try {
      const existing = (await getFromR2<SubscriberRecord[]>('subscribers/subscribers.json')) || (initialSubscribers as SubscriberRecord[]);
      const updatedList = existing.filter((s) => s.email !== cleanEmail);
      updatedList.push({
        ...newSubscriber,
        created_at: existing.find((s) => s.email === cleanEmail)?.created_at || nowIso
      });
      await saveToR2('subscribers/subscribers.json', updatedList);
    } catch (r2Err: any) {
      console.warn('[Subscribe] Error guardando en R2:', r2Err.message);
    }

    // 2. Notificación en tiempo real al canal de Telegram de la redacción
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    if (telegramToken && telegramChatId) {
      const tgText = [
        '📬 <b>¡Nuevo suscriptor en Acordes Ocultos!</b>',
        '',
        `📧 <b>Correo:</b> <code>${cleanEmail}</code>`,
        `📍 <b>País:</b> ${cleanCountry || 'N/A'}`,
        `🏷️ <b>Origen:</b> ${cleanSource}`,
        `🎁 <b>Incentivo:</b> Cofradía (Boletín semanal + Muestra de 3 crónicas)`,
        `📅 <b>Fecha:</b> ${nowIso}`
      ].join('\n');

      fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: tgText,
          parse_mode: 'HTML'
        })
      }).catch((tgErr) => console.warn('[Subscribe] Error notificando a Telegram:', tgErr.message));
    }

    // 3. Espejo opcional hacia Supabase (no bloqueante, no fatal)
    try {
      await supabase
        .from('subscribers')
        .upsert(
          {
            email: cleanEmail,
            source: cleanSource,
            ...(cleanCountry ? { country: cleanCountry } : {}),
            privacy_policy_consent: true,
            minors_declaration: 'over_14_years',
            consent_version: cleanVersion,
            purpose: cleanPurpose,
            consent_timestamp: nowIso,
            status: 'active',
            updated_at: nowIso
          },
          { onConflict: 'email' }
        );
    } catch (supaErr: any) {
      // Supabase caído o cuota superada: no interrumpe el éxito de la suscripción
      console.warn('[Subscribe] Aviso: Falló espejo en Supabase (no crítico):', supaErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tu correo ha quedado registrado en la Cofradía de Acordes Ocultos. Recibirás cada semana nuestras crónicas extendidas y el enlace de bienvenida con la muestra exclusiva de 3 crónicas de colección.',
        bookUrl: '/libro',
        gumroadUrl: 'https://acordesocultos.gumroad.com/l/ryhupd',
        bookTitle: 'Acordes Ocultos — Volumen 01'
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
