const test = require('node:test');
const assert = require('node:assert/strict');
const { proxyAccountRequest } = require('./account-proxy.cjs');
const origin = 'http://localhost:8081';
const config = { siteOrigin: origin, apiOrigin: 'http://127.0.0.1:5318', token: 'x'.repeat(43) };
const app = 'mini-apps/app_' + 'x'.repeat(43);
const headers = { Origin: origin, 'X-ANKT-Developer': '1', 'Content-Type': 'application/json' };

test('Mini App BFF allowlists CRUD and activity', async () => {
  const routes = [['GET', 'mini-apps'], ['POST', 'mini-apps'], ['GET', app], ['PATCH', app], ['DELETE', app], ['GET', app + '/activity']];
  for (const [method, path] of routes) {
    const response = await proxyAccountRequest(new Request(`${origin}/${path}`, { method, headers, ...(method === 'GET' ? {} : { body: '{}' }) }), path, config, async (url, init) => {
      assert.equal(init.headers.get('Authorization'), `DeveloperSession ${config.token}`);
      assert.equal(init.cache, 'no-store'); assert.equal(init.credentials, 'omit');
      assert.equal(url, `http://127.0.0.1:5318/api/developer/${path}${path === 'mini-apps' && method === 'GET' ? '?page=1' : ''}`);
      return Response.json({});
    });
    assert.equal(response.status, 200);
  }
});
test('Mini App BFF rejects path injection, unsafe methods and CSRF', async () => {
  let calls = 0; const upstream = async () => { calls++; return Response.json({}); };
  for (const path of [app + '/publish', app + '/../credentials', 'mini-apps/admin', app + '/credentials?secret=yes'])
    assert.equal((await proxyAccountRequest(new Request(`${origin}/`, { headers }), path, config, upstream)).status, 404);
  assert.equal((await proxyAccountRequest(new Request(`${origin}/`, { method: 'PUT', headers, body: '{}' }), app, config, upstream)).status, 404);
  assert.equal((await proxyAccountRequest(new Request(`${origin}/`, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: '{}' }), 'mini-apps', config, upstream)).status, 403);
  assert.equal(calls, 0);
});
test('Logo upload preserves binary bytes and MIME, enforces CSRF and 2 MiB limit', async () => {
  const bytes = new Uint8Array([137,80,78,71,13,10,26,10,255,0,254,128,42,32,60,10]);
  let calls = 0;
  const upstream = async (_url, init) => { calls++; assert.equal(init.headers.get('Content-Type'), 'image/png'); assert.deepEqual(init.body, bytes); return Response.json({ uploadId: 'id', url: 'https://example.com/logo.png' }); };
  const request = (body, extra = {}) => new Request(`${origin}/`, { method: 'POST', headers: { ...headers, 'Content-Type': 'image/png', ...extra }, body });
  assert.equal((await proxyAccountRequest(request(bytes), 'mini-apps/logo', config, upstream)).status, 200);
  assert.equal((await proxyAccountRequest(request(bytes, { Origin: 'https://evil.example' }), 'mini-apps/logo', config, upstream)).status, 403);
  assert.equal((await proxyAccountRequest(request(new Uint8Array(2097153)), 'mini-apps/logo', config, upstream)).status, 413);
  assert.equal(calls, 1);
});
test('Mini App JSON bounds permit long descriptions but preserve account bounds', async () => {
  const body = JSON.stringify({ description: 'Ứ'.repeat(10000) });
  const request = () => new Request(`${origin}/`, { method: 'PATCH', headers, body });
  const upstream = async () => Response.json({});
  assert.equal((await proxyAccountRequest(request(), app, config, upstream)).status, 200);
  assert.equal((await proxyAccountRequest(request(), 'profile', config, upstream)).status, 413);
});
