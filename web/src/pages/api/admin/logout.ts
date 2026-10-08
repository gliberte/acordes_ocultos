import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/admin-session';
export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
