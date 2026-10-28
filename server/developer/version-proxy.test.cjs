const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { proxyAccountRequest } = require('./account-proxy.cjs');
const { createDeveloperHandler } = require('./handler.cjs');
const origin = 'http://localhost:8081';
const config = { siteOrigin: origin, apiOrigin: 'http://127.0.0.1:5318', token: 'x'.repeat(43) };
const base = 'mini-apps/app_' + 'x'.repeat(43) + '/versions';
const detail = base + '/11111111-1111-4111-8111-111111111111';
const headers = { Origin: origin, 'X-ANKT-Developer': '1', 'Content-Type': 'application/json', Authorization: 'Bearer social-never-forward', Cookie: 'social=never-forward' };
const request = (method, query = '', body = '{}', extra = {}) => new Request(origin + query,
  { method, headers: { ...headers, ...extra }, ...(method === 'GET' ? {} : { body }) });

test('only exact version transport is allowed', async () => {
  let calls = 0;
  const upstream = async (url, init) => {
    calls++; assert.ok(url.startsWith(config.apiOrigin + '/api/developer/' + base));
    assert.equal(init.headers.get('Authorization'), 'DeveloperSession ' + config.token);
    assert.equal(init.headers.get('Cookie'), null); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    return Response.json({});
  };
  for (const [method, path] of [['GET', base], ['POST', base], ['GET', detail], ['PUT', detail]])
    assert.equal((await proxyAccountRequest(request(method), path, config, upstream)).status, 200);
  for (const [method, path] of [['DELETE', detail], ['POST', detail], ['PUT', base], ['GET', detail + '/production-credentials'],
    ['POST', detail + '/approve'], ['POST', detail + '/evidence'], ['POST', 'admin/' + detail], ['GET', base + '/draft']])
    assert.equal((await proxyAccountRequest(request(method), path, config, upstream)).status, 404);
  assert.equal(calls, 4);
});

test('version pagination is bounded and every other query field is rejected before fetch', async () => {
  let calls = 0;
  const upstream = async url => { calls++; assert.equal(url, config.apiOrigin + '/api/developer/' + base + '?page=2&pageSize=20'); return Response.json({}); };
  assert.equal((await proxyAccountRequest(request('GET', '?page=2&pageSize=20'), base, config, upstream)).status, 200);
  for (const query of ['?environment=Production', '?page=0', '?page=01', '?pageSize=101', '?page=1&page=2', '?page=100001', '?pageSize=1&actor=admin'])
    assert.equal((await proxyAccountRequest(request('GET', query), base, config, upstream)).status, 400);
  for (const [method, path] of [['POST', base], ['PUT', detail], ['GET', detail]])
    assert.equal((await proxyAccountRequest(request(method, '?environment=Production'), path, config, upstream)).status, 400);
  assert.equal(calls, 1);
});

test('version writes retain CSRF and strict route-specific body budgets', async () => {
  const upstream = async () => { throw new Error('must not fetch'); };
  assert.equal((await proxyAccountRequest(request('POST', '', '{}', { Origin: 'https://evil.example' }), base, config, upstream)).status, 403);
  assert.equal((await proxyAccountRequest(request('POST', '', '{}', { 'X-ANKT-Developer': '' }), base, config, upstream)).status, 403);
  for (const [method, path, limit] of [['POST', base, 1024], ['PUT', detail, 16384]])
    assert.equal((await proxyAccountRequest(request(method, '', 'x'.repeat(limit + 1)), path, config, upstream)).status, 413);
});

test('direct and Vercel routes preserve exact version filters and rejection', async () => {
  let calls = 0;
  const handler = createDeveloperHandler(config, async url => {
    calls++; assert.equal(url, config.apiOrigin + '/api/developer/' + base + '?page=2&pageSize=20'); return Response.json({ items: [] });
  });
  const server = http.createServer((req, res) => handler(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const local = 'http://127.0.0.1:' + server.address().port;
    for (const path of ['/developers/api/account/' + base + '?', '/api/developer?path=' + base + '&']) {
      assert.equal((await fetch(local + path + 'page=2&pageSize=20')).status, 200);
      assert.equal((await fetch(local + path + 'page=2&pageSize=20&environment=Production')).status, 400);
      assert.equal((await fetch(local + path + 'page=2&page=3')).status, 400);
    }
    assert.equal(calls, 2);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
