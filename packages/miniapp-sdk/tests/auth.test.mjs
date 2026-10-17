import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createMiniAppSdk, SdkError } from '../dist/index.js';

const options = {issuer:'https://issuer.example/',clientId:'sdk-public',redirectUri:'https://partner.example/callback'};
const {privateKey,publicKey} = generateKeyPairSync('rsa',{modulusLength:2048});
const jwk = {...publicKey.export({format:'jwk'}),kid:'fixture-key',alg:'RS256',use:'sig'};
const storage = () => {
  const data = new Map();
  return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
};
const metadata = {issuer:options.issuer,authorization_endpoint:options.issuer+'connect/authorize',token_endpoint:options.issuer+'connect/token',
  userinfo_endpoint:options.issuer+'connect/userinfo',jwks_uri:options.issuer+'.well-known/jwks.json',response_types_supported:['code'],
  subject_types_supported:['pairwise'],id_token_signing_alg_values_supported:['RS256'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none']};
function token(nonce, changes={}) {
  const now = Math.floor(Date.now()/1000);
  const payload = {iss:options.issuer,aud:options.clientId,sub:'pairwise-test-user',iat:now,exp:now+300,nonce,...changes};
  const parts = [Buffer.from(JSON.stringify({alg:'RS256',kid:'fixture-key'})).toString('base64url'),Buffer.from(JSON.stringify(payload)).toString('base64url')];
  return [...parts,sign('RSA-SHA256',Buffer.from(parts.join('.')),privateKey).toString('base64url')].join('.');
}
async function fixture(run, changes={}) {
  const originalFetch = globalThis.fetch; const store = storage(); let nonce; const requests=[];
  globalThis.fetch = async (url, init={}) => {
    requests.push({url:String(url),init});
    assert.equal(init.credentials,'omit'); assert.equal(init.redirect,'error');
    const json = body => new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
    if (String(url).endsWith('/.well-known/openid-configuration')) return json({...metadata,...changes.metadata});
    if (String(url).endsWith('/.well-known/jwks.json')) return json({keys:[jwk]});
    if (String(url).endsWith('/connect/token')) {
      if (changes.waitForToken) await changes.waitForToken();
      assert.equal(new URLSearchParams(init.body).has('client_secret'),false);
      let identity = token(nonce,changes.claims);
      if(changes.badSignature) identity = identity.slice(0,identity.lastIndexOf('.')+1)+Buffer.alloc(256).toString('base64url');
      return json({access_token:'opaque-access-fixture',token_type:'Bearer',expires_in:300,id_token:identity});
    }
    if (String(url).endsWith('/connect/userinfo')) return json({sub:changes.userSubject??'pairwise-test-user',name:'Example User'});
    throw new Error('Unexpected request');
  };
  try {
    const sdk=createMiniAppSdk(options,store);
    const url=await sdk.auth.login({navigate:false}); nonce=url.searchParams.get('nonce');
    const callback=new URL(options.redirectUri); callback.searchParams.set('state',url.searchParams.get('state')); callback.searchParams.set('code','one-time-code');
    await run({sdk,store,url,callback,requests});
  } finally {globalThis.fetch=originalFetch;}
}

test('real library validates signed ID token; reload keeps only pending PKCE state and logout is local',async()=>{
  await fixture(async({sdk,store,url,callback,requests})=>{
    assert.equal(url.searchParams.get('code_challenge_method'),'S256'); assert.equal(url.searchParams.get('response_type'),'code');
    assert.equal(sdk.auth.getStatus(),'unauthenticated');
    const reloaded=createMiniAppSdk(options,store);
    await reloaded.auth.handleRedirect(callback);
    assert.equal(reloaded.auth.getStatus(),'authenticated'); assert.equal(store.data.size,0);
    assert.equal((await reloaded.auth.getUser()).sub,'pairwise-test-user');
    assert.ok(requests.some(r=>r.url.endsWith('/.well-known/jwks.json')));
    assert.equal(createMiniAppSdk(options,store).auth.getStatus(),'unauthenticated');
    await assert.rejects(()=>reloaded.auth.handleRedirect(callback),e=>e.code==='INVALID_TRANSACTION');
    reloaded.auth.logout(); assert.equal(reloaded.auth.getStatus(),'unauthenticated');
    await assert.rejects(()=>reloaded.auth.getUser(),e=>e.code==='NOT_AUTHENTICATED');
    assert.equal(requests.some(r=>r.url.includes('logout')||r.url.includes('revocation')),false);
  });
});
for(const [name,changes] of [
  ['nonce',{claims:{nonce:'wrong'}}],['issuer',{claims:{iss:'https://evil.example/'}}],
  ['audience',{claims:{aud:'another-client'}}],['expiry',{claims:{exp:1}}],['signature',{badSignature:true}],
]) test(`rejects invalid ID token ${name} without retaining identity or token`,async()=>{
  await fixture(async({sdk,callback,store})=>{
    await assert.rejects(()=>sdk.auth.handleRedirect(callback),e=>e instanceof SdkError&&e.code==='OIDC_FAILED'&&!e.message.includes('one-time-code'));
    assert.equal(sdk.auth.getStatus(),'unauthenticated'); assert.equal(store.data.size,0);
  },changes);
});
test('state and callback URL bindings reject injection before token exchange',async()=>{
  for(const change of [u=>u.searchParams.set('state','wrong'),u=>{u.hostname='evil.example';},u=>{u.hash='access_token=stolen';}])
    await fixture(async({sdk,callback,requests})=>{
      change(callback); await assert.rejects(()=>sdk.auth.handleRedirect(callback),SdkError);
      assert.equal(requests.some(r=>r.url.endsWith('/connect/token')),false);
    });
});
test('UserInfo is bound to validated ID token subject',async()=>{
  await fixture(async({sdk,callback})=>{
    await sdk.auth.handleRedirect(callback); await assert.rejects(()=>sdk.auth.getUser(),e=>e.code==='OIDC_FAILED');
    assert.equal(sdk.auth.getStatus(),'unauthenticated');
  },{userSubject:'someone-else'});
});
test('discovery rejects endpoint origin substitution',async()=>{
  await assert.rejects(()=>fixture(async()=>{}, {metadata:{token_endpoint:'https://evil.example/token'}}),SdkError);
});
test('expired transient transaction is consumed and cannot reach token exchange',async()=>{
  await fixture(async({sdk,store,callback,requests})=>{
    const [key,raw]=[...store.data][0];const transaction=JSON.parse(raw);transaction.createdAt=Date.now()-301000;
    store.setItem(key,JSON.stringify(transaction));
    await assert.rejects(()=>sdk.auth.handleRedirect(callback),e=>e.code==='INVALID_TRANSACTION');
    assert.equal(store.data.size,0);assert.equal(requests.some(r=>r.url.endsWith('/connect/token')),false);
  });
});
test('logout during a pending exchange cannot restore authentication',async()=>{
  let release;let started;
  const begin=new Promise(resolve=>{started=resolve;});
  const gate=new Promise(resolve=>{release=resolve;});
  await fixture(async({sdk,callback})=>{
    const exchange=sdk.auth.handleRedirect(callback);
    await begin;sdk.auth.logout();release();
    await assert.rejects(()=>exchange,e=>e.code==='INVALID_TRANSACTION');
    assert.equal(sdk.auth.getStatus(),'unauthenticated');
  },{waitForToken:()=>{started();return gate;}});
});
test('discovery timeout is bounded and sanitized',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=(_url,init)=>new Promise((_resolve,reject)=>{
    init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true});
  });
  // AbortSignal.timeout timers are unreferenced in Node; keep this test alive.
  const keepAlive=setTimeout(()=>{},1000);
  try {await assert.rejects(()=>createMiniAppSdk({...options,timeoutMs:100},storage()).initialize(),e=>e.code==='OIDC_FAILED');}
  finally{clearTimeout(keepAlive);globalThis.fetch=previous;}
});
