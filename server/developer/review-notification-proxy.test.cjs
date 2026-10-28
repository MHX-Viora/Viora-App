const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { proxyAccountRequest } = require('./account-proxy.cjs');
const { createDeveloperHandler } = require('./handler.cjs');
const origin = 'http://localhost:8081';
const config = { siteOrigin: origin, apiOrigin: 'http://127.0.0.1:5318', token: 'n'.repeat(43) };
const path = 'review-notifications';
const read = path + '/11111111-1111-4111-8111-111111111111/read';
function request(method, query = '', body = '{}') {
  return new Request(origin + query, { method, headers: { Origin: origin, 'X-ANKT-Developer': '1', 'Content-Type': 'application/json' },
    ...(method === 'GET' ? {} : { body }) });
}
test('review inbox transport only allows bounded recipient-free lists and owned mark-read', async () => {
  const urls = []; const upstream = async (url, init) => { urls.push(url); assert.equal(init.headers.get('Authorization'), 'DeveloperSession ' + config.token); return Response.json({}); };
  assert.equal((await proxyAccountRequest(request('GET', '?page=2&pageSize=20&unread=true'), path, config, upstream)).status, 200);
  assert.equal(urls[0], config.apiOrigin + '/api/developer/' + path + '?page=2&pageSize=20&unread=true');
  for (const query of ['?recipient=someone', '?page=1&page=2', '?page=0', '?pageSize=101', '?unread=1', '?unread=true&unread=false'])
    assert.equal((await proxyAccountRequest(request('GET', query), path, config, upstream)).status, 400);
  assert.equal((await proxyAccountRequest(request('POST'), read, config, upstream)).status, 200);
  assert.equal((await proxyAccountRequest(request('POST', '?recipient=someone'), read, config, upstream)).status, 400);
  assert.equal((await proxyAccountRequest(request('POST', '', 'x'.repeat(1025)), read, config, upstream)).status, 413);
  for (const [method, route] of [['POST', path], ['GET', read], ['DELETE', read], ['POST', path + '/all/read']])
    assert.equal((await proxyAccountRequest(request(method), route, config, upstream)).status, 404);
  assert.equal(urls.length, 2);
});
test('direct and Vercel inbox routes preserve filters and unknown query for rejection', async () => {
  const handler = createDeveloperHandler(config, async url => {
    assert.equal(url, config.apiOrigin + '/api/developer/' + path + '?unread=true&pageSize=20'); return Response.json({});
  });
  const server = http.createServer((req, res) => handler(req, res)); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const local = 'http://127.0.0.1:' + server.address().port;
    for (const url of ['/developers/api/account/' + path + '?', '/api/developer?path=' + path + '&']) {
      assert.equal((await fetch(local + url + 'unread=true&pageSize=20')).status, 200);
      assert.equal((await fetch(local + url + 'unread=true&pageSize=20&recipient=someone')).status, 400);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
