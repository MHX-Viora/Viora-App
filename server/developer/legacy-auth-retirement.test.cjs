const test = require('node:test');
const assert = require('node:assert/strict');
const {proxyAccountRequest} = require('./account-proxy.cjs');
test('retired Mini App login routes never reach upstream', async () => {
  const origin = 'http://localhost:8081', app = 'mini-apps/app_' + 'x'.repeat(43);
  let calls = 0;
  for (const suffix of ['/sso', '/sso/Sandbox', '/credentials', '/credentials/rotate', '/redirect-uris']) {
    for (const method of ['GET', 'PUT', 'POST']) {
      const response = await proxyAccountRequest(new Request(origin, {method, headers: {Origin: origin, 'X-ANKT-Developer': '1'}, ...(method === 'GET' ? {} : {body: '{}'})}), app + suffix,
        {siteOrigin: origin, apiOrigin: 'http://127.0.0.1:5318', token: 'x'.repeat(43)}, async () => { calls++; return Response.json({}); });
      assert.equal(response.status, 404);
    }
  }
  assert.equal(calls, 0);
});
