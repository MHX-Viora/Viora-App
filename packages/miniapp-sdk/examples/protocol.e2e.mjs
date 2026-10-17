import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMiniAppSdk} from '../dist/index.js';

// Opt-in real HTTPS fixture test. No application DB/configuration or real account.
// This HTTP driver supplements browser checks; it does not emulate SameSite/CSP.
const issuer = 'https://127.0.0.1:5490/';
const publicOrigin = 'https://localhost:5491';
const privateOrigin = 'https://127.0.0.2:5492';
const allowed = new Set([new URL(issuer).origin, publicOrigin, privateOrigin]);
const jars = new Map();
const decode = value => value.replace(/&(?:amp|quot|#x27|#39|lt|gt);/g, char =>
  ({'&amp;': '&', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>'}[char]));
async function request(url, form) {
  url = new URL(url); assert.ok(allowed.has(url.origin), 'fixture origin only');
  const cookies = jars.get(url.origin) ?? new Map(); jars.set(url.origin, cookies);
  const response = await fetch(url, {method: form ? 'POST' : 'GET', redirect: 'manual',
    headers: {Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
      ...(form ? {Origin: url.origin, 'Content-Type': 'application/x-www-form-urlencoded'} : {})}, body: form?.toString()});
  for (const item of response.headers.getSetCookie()) {
    const [pair] = item.split(';'); const index = pair.indexOf('=');
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return response;
}
function fields(html) {
  const result = new URLSearchParams();
  for (const tag of html.matchAll(/<input\b[^>]*>/g)) {
    const attributes = {};
    for (const match of tag[0].matchAll(/([\w-]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attributes[match[1]] = decode(match[2] ?? match[3] ?? match[4]);
    if (attributes.name) result.set(attributes.name, attributes.value ?? '');
  }
  return result;
}
async function navigate(start, callback) {
  let url = new URL(start);
  for (let count = 0; count < 15; count++) {
    if (callback && url.origin + url.pathname === callback) return {callback: url};
    const response = await request(url);
    if ([302, 303].includes(response.status)) { url = new URL(response.headers.get('location'), url); continue; }
    assert.equal(response.status, url.origin === privateOrigin && url.pathname === '/error' ? 400 : 200, 'fixture page has expected status');
    const html = await response.text();
    if (url.pathname === '/sso/login') {
      const login = await request(new URL('/fixture/login', issuer), fields(html));
      assert.equal(login.status, 302, 'fixture bootstrap succeeds');
      url = new URL(login.headers.get('location'), issuer); continue;
    }
    return {url, html};
  }
  throw new Error('Fixture redirect limit reached');
}
async function approve(page, callback) {
  assert.ok(page.html.includes('name="consent_ticket"'), 'explicit consent shown');
  const form = fields(page.html); form.set('decision', 'allow');
  const response = await request(page.url, form);
  assert.equal(response.status, 302, 'approval redirects');
  return navigate(new URL(response.headers.get('location'), page.url), callback);
}
async function revoke(kind) {
  const response = await request(issuer); const form = fields(await response.text());
  const revoked = await request(new URL('/fixture/revoke/' + kind, issuer), form);
  assert.equal(revoked.status, 302, 'owner revokes grant');
}

test('real isolated public SDK and confidential backend protocol/session lifecycle', async () => {
  let stage = 'public configuration';
  try {
    const response = await request(publicOrigin + '/config.json');
    const config = await response.json(); assert.equal(config.clientSecret, undefined);
    const values = new Map();
    const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
    let sdk = createMiniAppSdk(config, storage); await sdk.initialize();
    stage = 'public consent and exchange';
    let page = await navigate(await sdk.auth.login({navigate: false}), config.redirectUri);
    // A repeat run can reuse issuer-side consent. Force explicit consent either way.
    if (page.callback) page = await navigate(await sdk.auth.login({navigate: false, prompt: 'consent'}), config.redirectUri);
    page = await approve(page, config.redirectUri); await sdk.auth.handleRedirect(page.callback);
    const subject = (await sdk.auth.getUser()).sub; assert.ok(subject);
    stage = 'public reload and fast path';
    sdk = createMiniAppSdk(config, storage); assert.equal(sdk.auth.getStatus(), 'unauthenticated');
    page = await navigate(await sdk.auth.login({navigate: false}), config.redirectUri);
    assert.ok(page.callback, 'unchanged consent uses fast path');
    await sdk.auth.handleRedirect(page.callback); assert.equal((await sdk.auth.getUser()).sub, subject);
    sdk.auth.logout(); assert.equal(sdk.auth.getStatus(), 'unauthenticated');
    page = await navigate(await sdk.auth.login({navigate: false}), config.redirectUri); await sdk.auth.handleRedirect(page.callback);
    stage = 'public revocation'; await revoke('public');
    stage = 'public revoked UserInfo';
    await assert.rejects(() => sdk.auth.getUser()); assert.equal(sdk.auth.getStatus(), 'unauthenticated');
    stage = 'public renewed consent'; page = await navigate(await sdk.auth.login({navigate: false}), config.redirectUri);
    page = await approve(page, config.redirectUri); await sdk.auth.handleRedirect(page.callback);
    assert.equal((await sdk.auth.getUser()).sub, subject);

    stage = 'confidential consent and server exchange';
    page = await navigate(privateOrigin + '/login');
    if (page.url.origin === new URL(issuer).origin) page = await approve(page);
    assert.ok(page.html.includes('id="status">authenticated'), 'backend session established');
    const partnerIdentity = page.html.match(/<pre id="user">([^<]+)<\/pre>/)?.[1];
    assert.ok(partnerIdentity); assert.ok(!page.html.includes('access_token'));
    page = await navigate(privateOrigin + '/'); assert.ok(page.html.includes(partnerIdentity), 'reload keeps partner session');
    page = await navigate(privateOrigin + '/me'); assert.ok(page.html.includes('id="status">authenticated'));
    stage = 'confidential CSRF and logout';
    const denied = await request(privateOrigin + '/logout', new URLSearchParams({csrf: 'forged'}));
    assert.equal(denied.status, 403);
    const logout = await request(privateOrigin + '/logout', fields(page.html)); assert.equal(logout.status, 303);
    page = await navigate(privateOrigin + '/'); assert.ok(page.html.includes('id="status">unauthenticated'));
    page = await navigate(privateOrigin + '/login'); assert.ok(page.html.includes('id="status">authenticated'), 'repeat skips consent');
    stage = 'confidential revocation'; await revoke('confidential');
    stage = 'confidential revoked UserInfo';
    page = await navigate(privateOrigin + '/me'); assert.ok(page.url.pathname === '/error');
    stage = 'confidential revoked session';
    page = await navigate(privateOrigin + '/'); assert.ok(page.html.includes('id="status">unauthenticated'));
    stage = 'confidential renewed consent';
    page = await approve(await navigate(privateOrigin + '/login'));
    assert.ok(page.html.includes(partnerIdentity), 'reauthorization preserves pairwise identity');
    stage = 'confidential callback injection';
    page = await navigate(privateOrigin + '/callback?code=forged&state=forged');
    assert.equal(page.url.pathname, '/error');
  } catch {
    // Keep protocol/library exceptions, callback URLs and credentials out of logs.
    throw new Error(`Isolated OIDC E2E failed during ${stage}`);
  }
});
