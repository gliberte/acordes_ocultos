import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parseEnv } from 'node:util';
const env = parseEnv(fs.readFileSync(new URL('../.env', import.meta.url), 'utf8'));
const base = process.env.ADMIN_TEST_BASE_URL || 'http://localhost:4328';
async function request(path, options = {}) { return fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(30000), ...options }); }
const checks = [];
for (const path of ['/admin','/admin/','/historias/private-test?preview=true']) {
 const res = await request(path); assert.equal(res.status, 302); assert.equal(res.headers.get('location'), '/admin/login'); assert.match(res.headers.get('cache-control'), /no-store/); checks.push('private gate: ' + path);
}
const loginPage = await request('/admin/login'); const loginHtml = await loginPage.text(); assert.equal(loginPage.status,200);
for (const value of [env.ADMIN_PASSWORD, env.ADMIN_SESSION_SECRET, env.SUPABASE_SECRET_KEY, Buffer.from(env.ADMIN_PASSWORD).toString('base64')].filter(Boolean)) assert.equal(loginHtml.includes(value),false);
checks.push('login HTML contains no server credentials');
for (const path of ['set-reel','update-cover','update-story','search-images','upload-image','toggle-visibility','comments']) {
 const res = await request('/api/' + path, { method: path === 'comments' ? 'DELETE' : 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{invalid JSON' }); assert.equal(res.status,401); checks.push('API gate before body parsing: ' + path);
}
const denied = await request('/api/admin/login', { method: 'POST', headers: { origin:'https://evil.test', 'content-type': 'application/json' }, body: JSON.stringify({password:env.ADMIN_PASSWORD}) }); assert.equal(denied.status,403); checks.push('foreign origin rejected');
const login = await request('/api/admin/login', { method: 'POST', headers: { origin:base, 'content-type':'application/json' }, body: JSON.stringify({password:env.ADMIN_PASSWORD}) }); assert.equal(login.status,200);
const cookieHeader = login.headers.get('set-cookie'); assert.match(cookieHeader,/HttpOnly/i); assert.match(cookieHeader,/SameSite=Strict/i); const cookie = cookieHeader.split(';')[0]; checks.push('server login creates HttpOnly SameSite session');
const admin = await request('/admin', { headers: { cookie } }); assert.equal(admin.status,200); assert.match(admin.headers.get('cache-control'),/no-store/);
const adminHtml = await admin.text();
for (const value of [env.ADMIN_PASSWORD, env.ADMIN_SESSION_SECRET, env.SUPABASE_SECRET_KEY, Buffer.from(env.ADMIN_PASSWORD).toString('base64')].filter(Boolean)) assert.equal(adminHtml.includes(value),false);
checks.push('authenticated dashboard renders without credentials');
const csrf = await request('/api/update-story',{method:'POST',headers:{cookie,origin:'https://evil.test','content-type':'application/json'},body:'{}'});assert.equal(csrf.status,403);checks.push('authenticated foreign mutation rejected');
const validation = await request('/api/update-story',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:'{}'});assert.equal(validation.status,400);checks.push('authenticated invalid edit reaches validation without database mutation');
const logout = await request('/api/admin/logout',{method:'POST',headers:{cookie,origin:base}});assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0|1970/i);checks.push('logout clears cookie');
console.log(JSON.stringify({passed:checks.length,checks},null,2));
