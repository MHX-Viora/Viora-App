const test = require('node:test'); const assert = require('node:assert/strict'); const http = require('node:http');
const { createDeveloperHandler } = require('./handler.cjs');
const { proxyAccountRequest } = require('./account-proxy.cjs');
const app = 'mini-apps/app_' + 'x'.repeat(43); const fileName = 'ankt-verify-' + 'a'.repeat(32) + '.txt';
const config = { siteOrigin: 'http://localhost:8081', apiOrigin: 'http://127.0.0.1:5318', token: 'x'.repeat(43) };
const headers = { Origin: config.siteOrigin, 'Content-Type': 'application/json', 'X-ANKT-Developer': '1' };
test('integration, domain and readiness have exact allowlisted methods and CSRF', async () => {
  for (const [method, suffix] of [['GET','integration'],['PUT','integration'],['GET','domain-verification'],['GET','domain-verification/file'],['POST','domain-verification/verify'],['POST','domain-verification/regenerate'],['GET','readiness']]) {
    const path = app + '/' + suffix;
    const response = await proxyAccountRequest(new Request('http://localhost/', { method, headers, ...(method === 'GET' ? {} : { body: '{}' }) }), path, config, async () => Response.json({}));
    assert.equal(response.status, 200);
  }
  let called = false; const upstream = async () => { called = true; return Response.json({}); };
  assert.equal((await proxyAccountRequest(new Request('http://localhost/', { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: '{}' }), app + '/domain-verification/verify', config, upstream)).status, 403);
  assert.equal((await proxyAccountRequest(new Request('http://localhost/'), app + '/domain-verification/file/other', config, upstream)).status, 404); assert.equal(called, false);
});
async function withHandler(upstream, run) {
  const handler = createDeveloperHandler(config, upstream); const server = http.createServer((req,res) => handler(req,res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise(resolve => server.close(resolve)); }
}
test('BFF forwards only bounded text attachments with generated safe filename and no-store', async () => {
  const content = 'ankt-domain-verification\napp_id=test\ndomain=partner.example.com\ntoken=test-only\n';
  await withHandler(async (_url, init) => { assert.match(init.headers.get('Authorization'), /^DeveloperSession /); return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename=${fileName}; filename*=UTF-8''${fileName}` } }); }, async origin => {
    const r = await fetch(`${origin}/developers/api/account/${app}/domain-verification/file`, { headers: { Cookie: `ankt_developer_local=${'x'.repeat(43)}` } });
    assert.equal(r.status, 200); assert.match(r.headers.get('Content-Disposition'), new RegExp(fileName)); assert.match(r.headers.get('Content-Type'), /^text\/plain/); assert.match(r.headers.get('Cache-Control'), /no-store/); assert.equal(await r.text(), content);
  });
});
test('BFF rejects oversized/malformed attachments and preserves JSON errors', async () => {
  for (const response of [new Response('x'.repeat(4097), { headers: { 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename=${fileName}` } }),new Response('bad', { headers: { 'Content-Type':'text/plain', 'Content-Disposition':'attachment; filename=../../secret.txt' } })]) {
    await withHandler(async () => response, async origin => { assert.equal((await fetch(`${origin}/developers/api/account/${app}/domain-verification/file`)).status,503); });
  }
  await withHandler(async () => Response.json({ error: { code:'MINI_APP_NOT_FOUND' } }, { status:404 }), async origin => {
    const r=await fetch(`${origin}/developers/api/account/${app}/domain-verification/file`); assert.equal(r.status,404); assert.match(r.headers.get('Content-Type'),/^application\/json/); assert.equal((await r.json()).error.code,'MINI_APP_NOT_FOUND');
  });
});
