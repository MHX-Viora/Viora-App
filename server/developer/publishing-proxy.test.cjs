const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { proxyAccountRequest } = require('./account-proxy.cjs');
const { createDeveloperHandler } = require('./handler.cjs');
const origin = 'http://localhost:8081';
const config = { siteOrigin: origin, apiOrigin: 'http://127.0.0.1:5318', token: 'p'.repeat(43) };
const app = 'mini-apps/app_' + 'p'.repeat(43);
const versionId = '11111111-1111-4111-8111-111111111111';
function request(method, query = '', body = '{}') {
  return new Request(origin + query, { method, headers: { Origin: origin, 'X-ANKT-Developer': '1', 'Content-Type': 'application/json' },
    ...(method === 'GET' ? {} : { body }) });
}
test('publication transport requires exact target and bounded private commands', async () => {
  const forwarded = [];
  const upstream = async (url, init) => { forwarded.push(url); assert.equal(init.headers.get('Authorization'), 'DeveloperSession ' + config.token); return Response.json({}); };
  assert.equal((await proxyAccountRequest(request('GET', '?versionId=' + versionId), app + '/publication-readiness', config, upstream)).status, 200);
  assert.equal(forwarded[0], config.apiOrigin + '/api/developer/' + app + '/publication-readiness?versionId=' + versionId);
  for (const query of ['', '?versionId=bad', '?versionId=' + versionId + '&versionId=' + versionId, '?versionId=' + versionId + '&ready=true'])
    assert.equal((await proxyAccountRequest(request('GET', query), app + '/publication-readiness', config, upstream)).status, 400);
  assert.equal((await proxyAccountRequest(request('GET', '?page=2&pageSize=20'), app + '/publications', config, upstream)).status, 200);
  for (const command of ['publish', 'unpublish']) {
    assert.equal((await proxyAccountRequest(request('POST'), app + '/' + command, config, upstream)).status, 200);
    assert.equal((await proxyAccountRequest(request('GET'), app + '/' + command, config, upstream)).status, 404);
    assert.equal((await proxyAccountRequest(request('POST', '?actor=admin'), app + '/' + command, config, upstream)).status, 400);
    assert.equal((await proxyAccountRequest(request('POST', '', 'x'.repeat(4097)), app + '/' + command, config, upstream)).status, 413);
  }
  assert.equal(forwarded.length, 4);
});
test('direct and Vercel publication rewrites preserve target and reject extra query', async () => {
  const handler = createDeveloperHandler(config, async url => {
    assert.equal(url, config.apiOrigin + '/api/developer/' + app + '/publication-readiness?versionId=' + versionId); return Response.json({});
  });
  const server = http.createServer((req, res) => handler(req, res)); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const local = 'http://127.0.0.1:' + server.address().port;
    for (const path of ['/developers/api/account/' + app + '/publication-readiness?', '/api/developer?path=' + app + '/publication-readiness&']) {
      assert.equal((await fetch(local + path + 'versionId=' + versionId)).status, 200);
      assert.equal((await fetch(local + path + 'versionId=' + versionId + '&actor=admin')).status, 400);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
