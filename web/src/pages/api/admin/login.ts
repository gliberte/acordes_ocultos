import type { APIRoute } from 'astro';
import { adminConfig, configured, passwordMatches, allowLogin, issueSession, cookieOptions, SESSION_COOKIE } from '../../../lib/admin-session';
export const prerender = false;
export const POST: APIRoute = async (context) => {
  const reply = (error: string, status: number) => new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
  const config = adminConfig();
  if (!configured(config)) return reply('Administración no configurada.', 503);
  if (!allowLogin(context.clientAddress)) return reply('Demasiados intentos. Intenta en 15 minutos.', 429);
  if (!context.request.headers.get('content-type')?.includes('application/json')) return reply('Formato inválido.', 415);
  // Bound input before parsing so an oversized password cannot exhaust this endpoint.
  const reader = context.request.body?.getReader();
  if (!reader) return reply('Solicitud inválida.', 400);
  let text = '', bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 4096) { await reader.cancel(); return reply('Solicitud demasiado grande.', 413); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const body = JSON.parse(text);
    if (!passwordMatches(body?.password, config.password)) return reply('Contraseña incorrecta.', 401);
    context.cookies.set(SESSION_COOKIE, issueSession(config), cookieOptions(import.meta.env.PROD || context.url.protocol === 'https:'));
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return reply('Solicitud inválida.', 400); }
};
