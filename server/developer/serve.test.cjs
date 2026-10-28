const assert = require('node:assert/strict');
const test = require('node:test');
const { createDeveloperServer } = require('./serve.cjs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

test('VPS BFF returns JSON 401 immediately for a missing developer cookie', async () => {
  let calls = 0;
  const server = createDeveloperServer({ siteOrigin: 'https://portal.example', apiOrigin: 'https://api.example', production: true }, async () => { calls++; throw new Error('Unexpected upstream request'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/developers/api/account/auth/me`, { headers: { 'X-ANKT-Developer': '1' } });
    assert.equal(response.status, 401);
    assert.match(response.headers.get('Content-Type'), /application\/json/);
    assert.match(response.headers.get('Cache-Control'), /no-store/);
    assert.ok((await response.json()).error);
    assert.equal(calls, 0);
    await promisify(execFile)(process.execPath, ['scripts/check-developer-session.mjs', `http://127.0.0.1:${server.address().port}`]);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('deploy check rejects the HTML SPA fallback instead of reporting a healthy account API', async () => {
  const server = require('node:http').createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<html>SPA fallback</html>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(promisify(execFile)(process.execPath, ['scripts/check-developer-session.mjs', `http://127.0.0.1:${server.address().port}`]), /Developer API must return JSON 401/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('VPS BFF forwards developer cookie as server-side authorization and preserves JSON', async () => {
  let calls = 0;
  const server = createDeveloperServer({ siteOrigin: 'https://portal.example', apiOrigin: 'https://api.example', production: true,
    bffSecret: 'test-only-fixture-signing-material-12345', clientIp: '203.0.113.7' }, async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.example/api/developer/auth/me');
    assert.equal(init.headers.get('Authorization'), 'DeveloperSession ' + 's'.repeat(43));
    return Response.json({ fullName: 'Fixture account' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base + '/developers/api/account/auth/me', { headers: { Cookie: '__Secure-ankt_developer=' + 's'.repeat(43), 'X-ANKT-Developer': '1' } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { fullName: 'Fixture account' });
    assert.equal(calls, 1);
    const missing = await fetch(base + '/developers/api/unknown');
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get('Content-Type'), /application\/json/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('loopback nginx client attribution is opt-in and validates the supplied address', async () => {
  const names = ['NODE_ENV', 'VERCEL', 'DEVELOPER_SITE_ORIGIN', 'ANKT_API_BASE_URL', 'ANKT_BFF_SHARED_SECRET', 'ANKT_BFF_TRUST_LOOPBACK_PROXY'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, { NODE_ENV: 'production', VERCEL: '0', DEVELOPER_SITE_ORIGIN: 'https://portal.example', ANKT_API_BASE_URL: 'https://api.example', ANKT_BFF_SHARED_SECRET: 'test-only-signing-material-at-least-32-bytes' });
  let observed;
  const server = createDeveloperServer(undefined, async (_url, init) => { observed = init.headers.get('X-ANKT-Bff-IP'); return Response.json({ fixture: true }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/developers/api/account/auth/me`;
    const headers = { Cookie: '__Secure-ankt_developer=' + 's'.repeat(43), 'X-Real-IP': '203.0.113.7' };
    delete process.env.ANKT_BFF_TRUST_LOOPBACK_PROXY;
    assert.equal((await fetch(url, { headers })).status, 200); assert.equal(observed, '127.0.0.1');
    process.env.ANKT_BFF_TRUST_LOOPBACK_PROXY = 'true';
    assert.equal((await fetch(url, { headers })).status, 200); assert.equal(observed, '203.0.113.7');
    assert.equal((await fetch(url, { headers: { ...headers, 'X-Real-IP': 'invalid-address' } })).status, 503);
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
  }
});
