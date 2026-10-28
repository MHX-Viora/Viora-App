const test=require('node:test'),assert=require('node:assert/strict');
const {configureSandboxPolicy}=require('./sandbox-policy.cjs');
const {configureMiniAppPolicy}=require('../mini-app-host-policy.cjs');
const {proxyAccountRequest}=require('./account-proxy.cjs');
const base=require('./vercel-base.json');
test('bridge iframe CSP works without OIDC issuer or separate host and remains scoped to Mini App routes',()=>{
  const config=configureSandboxPolicy(base,{EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED:'true'});
  const rule=config.headers.find(x=>x.source.includes('/sandbox(/)?'));assert.ok(rule.headers[0].value.includes('frame-src https:;'));
  assert.ok(config.headers.find(x=>x.source.includes('?!console')).headers[0].value.includes("frame-src 'none';"));
  const web=configureMiniAppPolicy(base,{EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED:'true',EXPO_PUBLIC_API_URL:'https://api.example'});
  assert.ok(web.headers.find(x=>x.source.startsWith('/mini-apps/')).headers.some(x=>x.value.includes('frame-src https:;')));
});
test('BFF forwards owner-bound bridge launch and never accepts arbitrary bridge routes',async()=>{
  const siteOrigin='https://portal.example',path='mini-apps/app_'+'a'.repeat(43)+'/auth-bridge/launch';let calls=0;
  const request=()=>new Request(siteOrigin,{method:'POST',headers:{Origin:siteOrigin,'X-ANKT-Developer':'1','Content-Type':'application/json'},body:'{}'});
  const fetcher=async(url,init)=>{calls++;assert.equal(init.headers.get('Authorization'),'DeveloperSession '+ 't'.repeat(43));return Response.json({});};
  const config={siteOrigin,apiOrigin:'https://api.example',token:'t'.repeat(43)};
  assert.equal((await proxyAccountRequest(request(),path,config,fetcher)).status,200);
  assert.equal((await proxyAccountRequest(request(),path+'/unsafe',config,fetcher)).status,404);assert.equal(calls,1);
});

test('credential reveal is an authenticated same-origin POST-only route',async()=>{
  const siteOrigin='https://portal.example',path='mini-apps/app_'+'a'.repeat(43)+'/auth-bridge/credentials/reveal';let calls=0;
  const config={siteOrigin,apiOrigin:'https://api.example',token:'t'.repeat(43)};
  const fetcher=async(url,init)=>{calls++;assert.ok(url.endsWith('/'+path));assert.equal(init.headers.get('Authorization'),'DeveloperSession '+'t'.repeat(43));return Response.json({clientId:'app_'+'a'.repeat(43),environment:'Production',clientSecret:'test-only-private-value'});};
  const request=(method='POST',origin=siteOrigin)=>new Request(siteOrigin,{method,headers:{Origin:origin,'X-ANKT-Developer':'1','Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({environment:'Production'})}:{})});
  const response=await proxyAccountRequest(request(),path,config,fetcher);
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal((await proxyAccountRequest(request('GET'),path,config,fetcher)).status,404);
  assert.equal((await proxyAccountRequest(request('POST','https://other.example'),path,config,fetcher)).status,403);
  assert.equal(calls,1);
});
