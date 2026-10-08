import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  issueSession,
  validSession,
  SESSION_SECONDS,
  passwordMatches,
  sameOrigin,
  protectedApi,
  allowLogin,
  allowPublicAction,
  cookieOptions,
  SECURITY_HEADERS
} from '../src/lib/admin-session.ts';
import { formatChronicleMarkdown, sanitizeUrl } from '../src/lib/markdown.ts';

const config = { password: 'test-admin-password', secret: 'x'.repeat(64) };
const now = 1_800_000_000_000;
test('signed sessions expire and resist tampering and credential rotation', () => {
  const token = issueSession(config, now);
  assert.equal(validSession(token, config, now), true);
  assert.equal(validSession(token, config, now + SESSION_SECONDS * 1000), false);
  assert.equal(validSession(token + 'x', config, now), false);
  assert.equal(validSession(token.replace(/^./, 'Z'), config, now), false);
  assert.equal(validSession(token, { ...config, password: 'rotated' }, now), false);
  assert.equal(validSession(token, { ...config, secret: 'y'.repeat(64) }, now), false);
  for (const value of [undefined, '', 'bad', 'a.b.c', 'x'.repeat(513)]) assert.equal(validSession(value, config, now), false);
  assert.equal(validSession(token, { ...config, password: '' }, now), false);
  assert.throws(() => issueSession({ ...config, secret: '' }));
});
test('password validation rejects malformed and missing credentials', () => {
  assert.equal(passwordMatches(' test-admin-password ', config.password), true);
  for (const value of ['', null, 1, {}, 'wrong', 'x'.repeat(1025)]) assert.equal(passwordMatches(value, config.password), false);
  assert.equal(passwordMatches('', ''), false);
});
test('mutations require exact request origin', () => {
  for (const origin of [undefined, 'null', 'https://evil.test', 'https://admin.test.evil.test']) {
    assert.equal(sameOrigin(new Request('https://admin.test/api/admin/login', { headers: origin ? { origin } : {} })), false);
  }
  assert.equal(sameOrigin(new Request('https://admin.test/api/admin/login', { headers: { origin: 'https://admin.test' } })), true);
});
test('all editorial APIs and comment deletion require sessions', () => {
  for (const path of ['set-reel','update-cover','update-story','search-images','upload-image','toggle-visibility','admin/logout']) assert.equal(protectedApi('/api/' + path, 'POST'), true);
  for (const path of ['analyze-potential','generate-story','generate-images','future-job']) assert.equal(protectedApi('/api/admin/studio/' + path, 'POST'), true);
  assert.equal(protectedApi('/api/comments', 'DELETE'), true);
  assert.equal(protectedApi('/api/comments', 'POST'), false);
  assert.equal(protectedApi('/api/comments', 'GET'), false);
});
test('cookies restrict script access and transport; attempts reset after window', () => {
  assert.deepEqual(cookieOptions(true), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS });
  for (let i = 0; i < 5; i++) assert.equal(allowLogin('test-address', now), true);
  assert.equal(allowLogin('test-address', now), false);
  assert.equal(allowLogin('test-address', now + 15 * 60_000), true);
});
test('public rate limiter enforces maxRequests and resets after window', () => {
  for (let i = 0; i < 3; i++) assert.equal(allowPublicAction('sub:1.2.3.4', 3, 60_000, now), true);
  assert.equal(allowPublicAction('sub:1.2.3.4', 3, 60_000, now), false);
  assert.equal(allowPublicAction('sub:1.2.3.4', 3, 60_000, now + 60_000), true);
});
test('security headers include nosniff, frame protection, and CSP report-only', () => {
  assert.equal(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.equal(SECURITY_HEADERS['X-Frame-Options'], 'SAMEORIGIN');
  assert.ok(SECURITY_HEADERS['Content-Security-Policy-Report-Only'].includes("default-src 'self'"));
});
test('markdown sanitizer escapes raw HTML, event attributes, and dangerous URLs (S2)', () => {
  const malicious = [
    '# Título Principal',
    '',
    'Párrafo con <script>alert(1)</script> y <img src=x onerror=alert(1)>.',
    '',
    '<figure onclick="alert(2)"><img src=x onerror=alert(3)></figure>',
    '',
    '![alt" onerror="alert(4)](https://example.com/safe.jpg)',
    '',
    '![xss](javascript:alert(5))',
    '',
    '![data](data:text/html,<script>alert(6)</script>)'
  ].join('\n');

  const rendered = formatChronicleMarkdown(malicious, 'test-slug');
  assert.equal(rendered.includes('<script>'), false);
  assert.equal(rendered.includes('onerror='), false);
  assert.equal(rendered.includes('onclick='), false);
  assert.equal(rendered.includes('javascript:'), false);
  assert.equal(rendered.includes('data:text/html'), false);
  assert.equal(rendered.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true);
  assert.equal(rendered.includes('alt="alt&quot; onerror&#61;&quot;alert(4)"'), true);

  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('data:image/svg+xml;base64,PHN2Zz4='), '');
  assert.equal(sanitizeUrl('//evil.example/a.jpg'), '');
  assert.equal(sanitizeUrl('/articles/test/images/scene.webp'), '/articles/test/images/scene.webp');
  assert.equal(sanitizeUrl('https://pub.r2.dev/photo.webp'), 'https://pub.r2.dev/photo.webp');
});
