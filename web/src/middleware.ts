import { defineMiddleware } from 'astro:middleware';
import { adminConfig, PRIVATE_HEADERS, protectedApi, sameOrigin, SECURITY_HEADERS, SESSION_COOKIE, validSession } from './lib/admin-session';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname.replace(/\/+$/, '') || '/';
  context.locals.isAdmin = validSession(context.cookies.get(SESSION_COOKIE)?.value, adminConfig());
  const adminPage = path === '/admin' || path.startsWith('/admin/');
  const preview = path.startsWith('/historias/') && context.url.searchParams.get('preview') === 'true';
  const api = protectedApi(path, context.request.method);
  const authApi = path.startsWith('/api/admin/');
  const withHeaders = (response: Response, isPrivate: boolean) => {
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!headers.has(name)) headers.set(name, value);
    }
    if (isPrivate) {
      for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
  if ((api || authApi) && !['GET', 'HEAD', 'OPTIONS'].includes(context.request.method) && !sameOrigin(context.request)) {
    return new Response(JSON.stringify({ error: 'Origen no autorizado' }), { status: 403, headers: { ...SECURITY_HEADERS, ...PRIVATE_HEADERS, 'Content-Type': 'application/json' } });
  }
  if (api && !context.locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'La sesión expiró. Inicia sesión nuevamente.' }), { status: 401, headers: { ...SECURITY_HEADERS, ...PRIVATE_HEADERS, 'Content-Type': 'application/json' } });
  }
  if ((preview || (adminPage && path !== '/admin/login')) && !context.locals.isAdmin) {
    return withHeaders(context.redirect('/admin/login', 302), true);
  }
  const response = await next();
  return withHeaders(response, Boolean(adminPage || preview || api || authApi));
});
