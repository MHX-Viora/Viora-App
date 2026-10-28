const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { proxyAccountRequest } = require('./account-proxy.cjs');
const { createDeveloperHandler } = require('./handler.cjs');
const origin = 'http://localhost:8081';
const config = { siteOrigin: origin, apiOrigin: 'http://127.0.0.1:5318', token: 'r'.repeat(43) };
const app = 'mini-apps/app_' + 'r'.repeat(43);
const detail = app + '/reviews/11111111-1111-4111-8111-111111111111';
const request = (method, query = '', body = '{}') => new Request(origin + query, { method,
  headers: { Origin: origin, 'X-ANKT-Developer': '1', 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body }) });

test('only owned review/readiness methods are forwarded with strict bounded query and submit body', async () => {
  let calls = 0;
  const upstream = async (url, init) => { calls++; assert.equal(init.headers.get('Authorization'), 'DeveloperSession ' + config.token); return Response.json({}); };
  for (const [method, path] of [['GET', app + '/review-readiness'], ['GET', app + '/reviews'], ['GET', detail], ['POST', app + '/reviews']])
    assert.equal((await proxyAccountRequest(request(method), path, config, upstream)).status, 200);
  for (const [method, path] of [['PUT', detail], ['DELETE', detail], ['POST', detail + '/approve'], ['POST', detail + '/evidence'], ['GET', 'admin/' + detail]])
    assert.equal((await proxyAccountRequest(request(method), path, config, upstream)).status, 404);
  assert.equal((await proxyAccountRequest(request('GET', '?page=2&pageSize=20'), app + '/reviews', config, upstream)).status, 200);
  for (const query of ['?page=0', '?page=01', '?pageSize=101', '?page=1&page=2', '?status=Approved'])
    assert.equal((await proxyAccountRequest(request('GET', query), app + '/reviews', config, upstream)).status, 400);
  for (const path of [detail, app + '/review-readiness'])
    assert.equal((await proxyAccountRequest(request('GET', '?actor=admin'), path, config, upstream)).status, 400);
  assert.equal((await proxyAccountRequest(request('POST', '', 'x'.repeat(1025)), app + '/reviews', config, upstream)).status, 413);
  assert.equal(calls, 5);
});

test('direct and Vercel review rewrites preserve every query for validation', async () => {
  const handler = createDeveloperHandler(config, async url => {
    assert.equal(url, config.apiOrigin + '/api/developer/' + app + '/reviews?page=2&pageSize=20'); return Response.json({});
  });
  const server = http.createServer((req, res) => handler(req, res)); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const local = 'http://127.0.0.1:' + server.address().port;
    for (const path of ['/developers/api/account/' + app + '/reviews?', '/api/developer?path=' + app + '/reviews&']) {
      assert.equal((await fetch(local + path + 'page=2&pageSize=20')).status, 200);
      assert.equal((await fetch(local + path + 'page=2&pageSize=20&actor=admin')).status, 400);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('review/publication preflights retain the bounded 45s budget through the BFF', async () => {
  const original = AbortSignal.timeout, budgets = [];
  AbortSignal.timeout = milliseconds => { budgets.push(milliseconds); return new AbortController().signal; };
  try {
    const upstream = async () => Response.json({});
    for (const [method, suffix, query] of [['GET', 'review-readiness', ''], ['POST', 'reviews', ''], ['GET', 'publication-readiness', '?versionId=11111111-1111-4111-8111-111111111111'], ['POST', 'publish', '']])
      assert.equal((await proxyAccountRequest(request(method, query), app + '/' + suffix, config, upstream)).status, 200);
    assert.deepEqual(budgets, [45000, 45000, 45000, 45000]);
  } finally { AbortSignal.timeout = original; }
});
