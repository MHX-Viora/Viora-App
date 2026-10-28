const test = require('node:test');
const assert = require('node:assert/strict');
const { proxyAccountRequest } = require('./account-proxy.cjs');
const origin = 'https://portal.ankt.vn';
const app = 'mini-apps/app_' + 'x'.repeat(43);
const session = '11111111-1111-4111-8111-111111111111';
const config = { siteOrigin: origin, apiOrigin: 'https://api.ankt.vn', token: 'x'.repeat(43) };
const headers = { Origin: origin, 'X-ANKT-Developer': '1', 'Content-Type': 'application/json' };
const request = (method, body = '{}', extra = {}) => new Request(origin, { method, headers: {...headers, ...extra}, ...(method === 'GET' ? {} : {body}) });
test('readiness is an owned read with no environment or evidence input',async()=>{
  const path=app+'/sandbox/readiness';let calls=0;
  const upstream=async(url,init)=>{calls++;assert.equal(url,config.apiOrigin+'/api/developer/'+path);assert.equal(init.credentials,'omit');assert.equal(init.headers.get('Authorization'),'DeveloperSession '+config.token);return Response.json({readyForReview:false});};
  assert.equal((await proxyAccountRequest(request('GET'),path,config,upstream)).status,200);
  assert.equal((await proxyAccountRequest(new Request(origin+'?environment=Production'),path,config,upstream)).status,400);
  for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await proxyAccountRequest(request(method),path,config,upstream)).status,404);
  assert.equal(calls,1);
});
test('Sandbox BFF exposes only owner session management with existing credentials and CSRF boundary', async () => {
  const base = app + '/sandbox'; let calls = 0;
  const upstream = async (url, init) => {
    calls++; assert.equal(init.headers.get('Authorization'), 'DeveloperSession ' + config.token);
    assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    assert.equal(init.headers.has('Cookie'), false);
    assert.ok(url.startsWith(config.apiOrigin + '/api/developer/')); return Response.json({});
  };
  for (const [method, path] of [['GET', base+'/config'], ['POST', base+'/sessions'], ['GET', base+'/sessions/'+session], ['DELETE', base+'/sessions/'+session], ['POST', base+'/sessions/'+session+'/launch-grants']])
    assert.equal((await proxyAccountRequest(request(method), path, config, upstream)).status, 200);
  for (const path of [base+'/sessions', base+'/sessions/not-a-guid', base+'/sessions/'+session+'/redeem', base+'/runner', 'sandbox-runtime/context', 'admin/'+base, base+'/sessions/'+session+'?grant=secret'])
    assert.equal((await proxyAccountRequest(request('GET'), path, config, upstream)).status, 404);
  assert.equal((await proxyAccountRequest(request('POST', '{}', {Origin:'https://evil.example'}), base+'/sessions', config, upstream)).status, 403);
  assert.equal((await proxyAccountRequest(request('POST', JSON.stringify({value:'x'.repeat(1025)})), base+'/sessions', config, upstream)).status, 413);
  assert.equal(calls, 5);
});

test('diagnostics are read-only with exact bounded query fields and no runtime/evidence passthrough', async () => {
  const path=app+'/sandbox/diagnostics';let calls=0;
  const upstream=async(url,init)=>{calls++;assert.equal(url,config.apiOrigin+'/api/developer/'+path+'?sessionId='+session+'&category=Bridge&limit=20');assert.equal(init.credentials,'omit');return Response.json({items:[]});};
  const query='?sessionId='+session+'&category=Bridge&limit=20';
  assert.equal((await proxyAccountRequest(new Request(origin+query),path,config,upstream)).status,200);
  for(const invalid of ['',query+'&access_token=secret','?sessionId=bad',query+'&limit=21','?sessionId='+session+'&limit=101','?sessionId='+session+'&category=Unknown','?sessionId='+session+'&cursor=secret'])
    assert.equal((await proxyAccountRequest(new Request(origin+invalid),path,config,upstream)).status,400);
  assert.equal((await proxyAccountRequest(request('POST'),path,config,upstream)).status,404);
  assert.equal((await proxyAccountRequest(request('POST'),app+'/sandbox/sdk-observations',config,upstream)).status,404);
  assert.equal(calls,1);
});

test('test runs expose only create/list/get/cancel with scoped list queries',async()=>{
  const base=app+'/sandbox/test-runs';let calls=0;
  const upstream=async(_url,init)=>{calls++;assert.equal(init.credentials,'omit');assert.equal(init.headers.has('Cookie'),false);return Response.json({});};
  for(const [method,path] of [['POST',base],['GET',base+'/'+session],['DELETE',base+'/'+session]])
    assert.equal((await proxyAccountRequest(request(method),path,config,upstream)).status,200);
  const url=origin+'?sessionId='+session+'&limit=20';
  assert.equal((await proxyAccountRequest(new Request(url),base,config,async actual=>{calls++;assert.equal(actual,config.apiOrigin+'/api/developer/'+base+'?sessionId='+session+'&limit=20');return Response.json({});})).status,200);
  for(const [method,path] of [['PUT',base],['POST',base+'/'+session],['POST',base+'/'+session+'/results'],['POST',base+'/'+session+'/evidence'],['GET',base+'/invalid']])
    assert.equal((await proxyAccountRequest(request(method),path,config,upstream)).status,404);
  assert.equal((await proxyAccountRequest(new Request(url+'&category=Bridge'),base,config,upstream)).status,400);
  assert.equal(calls,4);
  assert.equal((await proxyAccountRequest(new Request(url+'&order=newest'),base,config,async actual=>{assert.ok(actual.endsWith('&order=newest'));return Response.json({});})).status,200);
  assert.equal((await proxyAccountRequest(new Request(url+'&order=unknown'),base,config,upstream)).status,400);
});
