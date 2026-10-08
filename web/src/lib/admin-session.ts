import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

export const SESSION_COOKIE = 'acordes_admin_session';
export const SESSION_SECONDS = 60 * 60 * 4;
export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' };
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy-Report-Only':
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; media-src 'self' https: blob:; connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://vitals.vercel-insights.com https://va.vercel-scripts.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};

export function adminConfig() {
  return {
    password: (import.meta.env?.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '').trim(),
    secret: import.meta.env?.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || '',
  };
}
export function configured(config: { password: string; secret: string }) {
  return Boolean(config.password && config.secret.length >= 32);
}
export function passwordMatches(input: unknown, password: string) {
  if (typeof input !== 'string' || !password || input.length > 1024) return false;
  const digest = (text: string) => createHash('sha256').update(text).digest();
  return timingSafeEqual(digest(input.trim()), digest(password));
}
function signature(payload: string, config: { password: string; secret: string }) {
  return createHmac('sha256', config.secret).update(config.password).update('\0').update(payload).digest('base64url');
}
export function issueSession(config: { password: string; secret: string }, now = Date.now()) {
  if (!configured(config)) throw new Error('Admin authentication is not configured');
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_SECONDS, nonce: randomBytes(24).toString('base64url') })).toString('base64url');
  return `${payload}.${signature(payload, config)}`;
}
export function validSession(token: string | undefined, config: { password: string; secret: string }, now = Date.now()) {
  if (!configured(config) || !token || token.length > 512) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const expected = Buffer.from(signature(parts[0], config));
    const supplied = Buffer.from(parts[1]);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const seconds = Math.floor(now / 1000);
    return Number.isInteger(payload.exp) && payload.exp > seconds && payload.exp <= seconds + SESSION_SECONDS && typeof payload.nonce === 'string';
  } catch { return false; }
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export function cookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: 'strict' as const, path: '/', maxAge: SESSION_SECONDS };
}
export function protectedApi(path: string, method: string) {
  return path.startsWith('/api/admin/studio/') || ['/api/set-reel', '/api/update-cover', '/api/update-story', '/api/search-images', '/api/upload-image', '/api/toggle-visibility', '/api/admin/logout'].includes(path) || (path === '/api/comments' && method === 'DELETE');
}
// Per-instance mitigation only. Production needs a shared limiter or hosting firewall.
const attempts = new Map<string, { count: number; until: number }>();
export function allowLogin(key: string, now = Date.now()) {
  for (const [id, entry] of attempts) if (entry.until <= now) attempts.delete(id);
  const entry = attempts.get(key) || { count: 0, until: now + 15 * 60_000 };
  if (attempts.size >= 10_000 && !attempts.has(key)) return false;
  attempts.set(key, entry);
  entry.count++;
  return entry.count <= 5;
}
const publicRateMap = new Map<string, { count: number; until: number }>();
export function allowPublicAction(key: string, maxRequests = 10, windowMs = 60_000, now = Date.now()) {
  for (const [id, entry] of publicRateMap) if (entry.until <= now) publicRateMap.delete(id);
  const entry = publicRateMap.get(key) || { count: 0, until: now + windowMs };
  if (publicRateMap.size >= 10_000 && !publicRateMap.has(key)) return false;
  publicRateMap.set(key, entry);
  entry.count++;
  return entry.count <= maxRequests;
}
export function getClientKey(request: Request, prefix: string): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown';
  return `${prefix}:${ip}`;
}
