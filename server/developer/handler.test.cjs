const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { createDeveloperHandler } = require('./handler.cjs');

async function fixture(run, upstream) {
  const handler = createDeveloperHandler({ siteOrigin: 'http://localhost:8081', apiOrigin: 'http://127.0.0.1:5318' }, upstream);
  const server = http.createServer((req, res) => handler(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const headers = { Origin: 'http://localhost:8081', 'Content-Type': 'application/json', 'X-ANKT-Developer': '1' };
test('readiness routes preserve query rejection through direct and Vercel routing',async()=>{
  const path='mini-apps/app_'+'x'.repeat(43)+'/sandbox/readiness';let calls=0;
  await fixture(async origin=>{
    for(const route of ['/developers/api/account/'+path,'/api/developer?path='+path]){
      assert.equal((await fetch(origin+route)).status,200);
      assert.equal((await fetch(origin+route+(route.includes('?')?'&':'?')+'environment=Production')).status,400);
    }
    assert.equal(calls,2);
  },async url=>{calls++;assert.equal(url,'http://127.0.0.1:5318/api/developer/'+path);return Response.json({readyForReview:false});});
});
test('Mini App pagination survives the deployed Vercel function rewrite', async () => {
  await fixture(async origin => {
    assert.equal((await fetch(`${origin}/api/developer?path=mini-apps&page=2`)).status, 200);
  }, async (url) => { assert.equal(url, 'http://127.0.0.1:5318/api/developer/mini-apps?page=2'); return Response.json({ items: [], page: 2 }); });
});

test('Sandbox diagnostic filters survive both direct routing and the Vercel rewrite', async () => {
  const path='mini-apps/app_'+'x'.repeat(43)+'/sandbox/diagnostics';const query='sessionId=11111111-1111-4111-8111-111111111111&category=Bridge&limit=20';
  await fixture(async origin=>{
    assert.equal((await fetch(origin+'/developers/api/account/'+path+'?'+query)).status,200);
    assert.equal((await fetch(origin+'/api/developer?path='+path+'&'+query)).status,200);
  },async url=>{assert.equal(url,'http://127.0.0.1:5318/api/developer/'+path+'?'+query);return Response.json({items:[]});});
});

test('test-run pagination survives direct and Vercel rewritten paths',async()=>{
  const path='mini-apps/app_'+'x'.repeat(43)+'/sandbox/test-runs';const query='sessionId=11111111-1111-4111-8111-111111111111&limit=20';
  await fixture(async origin=>{
    assert.equal((await fetch(origin+'/developers/api/account/'+path+'?'+query)).status,200);
    assert.equal((await fetch(origin+'/api/developer?path='+path+'&'+query)).status,200);
  },async url=>{assert.equal(url,'http://127.0.0.1:5318/api/developer/'+path+'?'+query);return Response.json({items:[]});});
});
test('BFF strips session tokens and issues only its HttpOnly scoped cookie', async () => {
  await fixture(async origin => {
    const response = await fetch(`${origin}/developers/api/account/auth/login`, { method: 'POST', headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), account);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /ankt_developer_local=/); assert.match(cookie, /HttpOnly/); assert.match(cookie, /Path=\/developers/); assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /Domain=/i); assert.doesNotMatch(cookie, /Expires=/i);
  }, async () => Response.json({ account, sessionToken: 'x'.repeat(43), rememberMe: false }));
});
test('BFF rejects CSRF, unknown paths and large bodies before reaching BE', async () => {
  let calls = 0;
  await fixture(async origin => {
    const url = `${origin}/developers/api/account/auth/login`;
    assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: '{}' })).status, 403);
    assert.equal((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ data: 'x'.repeat(17000) }) })).status, 413);
    assert.equal((await fetch(`${origin}/developers/api/account/../../admin`)).status, 404);
    assert.equal(calls, 0);
  }, async () => { calls++; return Response.json({}); });
});
test('BFF forwards no ANKT credentials and clears revoked cookies', async () => {
  await fixture(async origin => {
    const response = await fetch(`${origin}/developers/api/account/auth/me`, { headers: { Cookie: `ankt=private; ankt_developer_local=${'y'.repeat(43)}`, Authorization: 'Bearer private-ankt' } });
    assert.equal(response.status, 401); assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  }, async (_url, init) => {
    assert.equal(init.headers.get('Authorization'), `DeveloperSession ${'y'.repeat(43)}`);
    assert.equal(init.headers.get('Cookie'), null);
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 });
  });
});
test('BFF preserves bodyless 401 and 429 errors instead of turning them into outages', async () => {
  for (const status of [401, 429]) await fixture(async origin => {
    const response = await fetch(`${origin}/developers/api/account/auth/me`, { headers: { Cookie: 'ankt_developer_local=' + 'y'.repeat(43) } });
    assert.equal(response.status, status);
    assert.ok((await response.json()).error);
    if (status === 401) assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  }, async () => new Response(null, { status }));
});
test('root Vercel rewrite reaches the same allowlisted BFF', async () => {
  await fixture(async origin => {
    const response = await fetch(`${origin}/api/developer?path=auth/login`, { method: 'POST', headers, body: '{}' });
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), account);
  }, async url => {
    assert.equal(url, 'http://127.0.0.1:5318/api/developer/auth/login');
    return Response.json({ account, sessionToken: 'x'.repeat(43), rememberMe: true, absoluteExpiresAt: '2030-01-01T00:00:00Z' });
  });
});
test('production environment uses trusted Vercel attribution and issues a Secure cookie', async () => {
  const names = ['NODE_ENV', 'VERCEL', 'DEVELOPER_SITE_ORIGIN', 'SITE_ORIGIN', 'ANKT_API_BASE_URL', 'ANKT_BFF_SHARED_SECRET'];
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const server = http.createServer(createDeveloperHandler(undefined, async (_url, init) => {
    assert.equal(init.headers.get('X-ANKT-Bff-IP'), '203.0.113.7');
    assert.equal(init.headers.get('X-ANKT-Bff-Signature').length, 64);
    return Response.json({ account, sessionToken: 'z'.repeat(43), rememberMe: false });
  }));
  Object.assign(process.env, { NODE_ENV: 'production', VERCEL: '1', SITE_ORIGIN: 'https://mxh.ankt.vn', ANKT_API_BASE_URL: 'https://api.example.test', ANKT_BFF_SHARED_SECRET: 'test-only-signing-material-not-a-production-secret' });
  delete process.env.DEVELOPER_SITE_ORIGIN;
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/developer?path=auth/login`, { method: 'POST', headers: { ...headers, Origin: 'https://mxh.ankt.vn', 'X-Vercel-Forwarded-For': '203.0.113.7', 'X-ANKT-Client-IP': '192.0.2.1' }, body: '{}' });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /__Secure-ankt_developer=.*; Secure/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; }
  }
});
const account = { id: 'test-account', fullName: 'Developer Test', email: 'developer@example.test', emailVerifiedAt: '2026-10-15T00:00:00Z', hasPassword: true, status: 'Active', avatarUrl: null };
