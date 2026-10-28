import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnktMiniApp} from '../dist/host-auth.js';
const clientId='app_'+'a'.repeat(43),apiOrigin='https://api.example',hostOrigin='https://host.example',origin='https://partner.example';
test('browser defaults need only a client ID',()=>{
  const sdk=createAnktMiniApp({clientId});
  assert.equal(sdk.app.getEnvironment(),null);sdk.dispose();
});

test('default Bridge exchange and login-code requests use the canonical production API',async()=>{
  const oldFetch=globalThis.fetch,events=new EventTarget(),urls=[];
  const sessionId='11111111-1111-4111-8111-111111111111';
  const parent={postMessage(data,target){
    assert.equal(target,'https://mxh.ankt.vn');
    if(data.method!=='auth.login')return;
    const event=new Event('message');Object.assign(event,{source:parent,origin:target,data:{channel:'ankt.auth',version:1,type:'response',id:data.id,ok:true,
      result:{clientId,origin,sessionId,environment:'Production',code:'c'.repeat(43),expiresIn:60}}});events.dispatchEvent(event);
  }};
  globalThis.fetch=async(url)=>{
    urls.push(url);assert.ok(url.startsWith('https://api.mxh.ankt.vn/api/miniapp/auth/'));
    return url.endsWith('/code')?Response.json({code:'p'.repeat(43),expiresIn:60}):Response.json({access_token:'map_'+'t'.repeat(43),token_type:'Bearer',expires_in:300,scope:'profile',session_id:sessionId,environment:'Production'});
  };
  const sdk=createAnktMiniApp({clientId},{events,parent,origin});
  try{
    await sdk.auth.getLoginCode();
    assert.deepEqual(urls,['https://api.mxh.ankt.vn/api/miniapp/auth/exchange','https://api.mxh.ankt.vn/api/miniapp/auth/code']);
  }finally{sdk.dispose();globalThis.fetch=oldFetch;}
});
test('invalid client IDs, timeouts and host origins fail before messaging',()=>{
  for(const value of ['', 'app_bad', '*'])assert.throws(()=>createAnktMiniApp({clientId:value}),{code:'INVALID_CLIENT'});
  assert.throws(()=>createAnktMiniApp({clientId,timeoutMs:1}),{code:'INVALID_CLIENT'});
  for(const value of ['*','http://host.example','https://host.example/path'])assert.throws(()=>createAnktMiniApp({clientId,hostOrigin:value}),{code:'INVALID_ORIGIN'});
});
test('React Native transport receives string messages on window and document without iframe source assumptions',async()=>{
  const oldFetch=globalThis.fetch,events=new EventTarget(),documentEvents=new EventTarget();
  let sends=0;
  const native={postMessage(raw){sends++;const data=JSON.parse(raw);
    if(data.method!=='auth.login')return;
    const event=new Event('message');Object.assign(event,{data:JSON.stringify({channel:'ankt.auth',version:1,type:'response',id:data.id,ok:true,
      result:{sessionId:'11111111-1111-4111-8111-111111111111',clientId,origin,environment:'Production',code:'c'.repeat(43),expiresIn:60}})});
    documentEvents.dispatchEvent(event);
  }};
  globalThis.fetch=async(_url,init)=>Response.json({access_token:'map_'+'t'.repeat(43),token_type:'Bearer',expires_in:300,scope:'profile',
    session_id:JSON.parse(init.body).session_id,environment:'Production'});
  const sdk=createAnktMiniApp({apiOrigin,hostOrigin,clientId},{events,documentEvents,native,origin});
  try{await sdk.init();assert.equal(sends,1);assert.equal(sdk.app.getEnvironment(),'production');
    sdk.dispose();assert.equal(sdk.app.getEnvironment(),null);
    await assert.rejects(sdk.init(),{code:'HOST_UNAVAILABLE'});
  }finally{sdk.dispose();globalThis.fetch=oldFetch;}
});
test('Auth Bridge completes proof exchange, stores only Mini App token in memory and revokes on logout',async()=>{
  const oldFetch=globalThis.fetch,events=new EventTarget();let exchanges=0,revokes=0,verifier,challenge;const notifications=[];
  const parent={postMessage(data,target){assert.equal(target,hostOrigin);if(data.method==='auth.ready'){notifications.push(data);return;}
    challenge=data.params.codeChallenge;assert.equal(data.params.clientId,clientId);
    queueMicrotask(()=>{const event=new Event('message');Object.assign(event,{origin:hostOrigin,source:parent,data:{channel:'ankt.auth',version:1,type:'response',id:data.id,ok:true,
      result:{sessionId:'11111111-1111-4111-8111-111111111111',clientId,origin,environment:'Sandbox',code:'c'.repeat(43),expiresIn:60}}});events.dispatchEvent(event);});}};
  globalThis.fetch=async(url,init)=>{
    assert.ok(url.startsWith(apiOrigin+'/api/miniapp/auth/'));assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');
    if(url.endsWith('/exchange')){exchanges++;const body=JSON.parse(init.body);verifier=body.code_verifier;assert.equal(body.client_id,clientId);
      return Response.json({access_token:'mas_'+'t'.repeat(43),token_type:'Bearer',expires_in:300,scope:'profile',session_id:body.session_id,environment:'Sandbox'});}
    assert.equal(init.headers.Authorization,'Bearer mas_'+'t'.repeat(43));
    if(url.endsWith('/revoke')){revokes++;return new Response(null,{status:204});}
    return Response.json({id:'real-database-user',username:'ankt_sandbox_test',displayName:'Sandbox',isSandbox:true});
  };
  const sdk=createAnktMiniApp({apiOrigin,hostOrigin,clientId},{events,parent,origin});
  try{await Promise.all([sdk.init(),sdk.init()]);assert.equal(exchanges,1);
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
    assert.equal(Buffer.from(hash).toString('base64url'),challenge);assert.equal((await sdk.auth.getUserInfo()).isSandbox,true);
    const session=await sdk.auth.getSession();assert.equal(session.environment,'Sandbox');assert.equal(session.accessToken,undefined);assert.equal(notifications.length,1);
    await sdk.auth.logout();assert.equal(revokes,1);
  }finally{sdk.dispose();globalThis.fetch=oldFetch;}
});
test('standalone website cannot auto-login without a verified host',async()=>{
  const sdk=createAnktMiniApp({apiOrigin,hostOrigin,clientId});try{await assert.rejects(sdk.init(),e=>e.code==='HOST_UNAVAILABLE');}finally{sdk.dispose();}
});
test('disposing an in-flight exchange aborts fetch and cannot restore a session',async()=>{
  const oldFetch=globalThis.fetch,events=new EventTarget();let started;
  const exchangeStarted=new Promise(resolve=>started=resolve);
  const native={postMessage(raw){const request=JSON.parse(raw);const event=new Event('message');
    Object.assign(event,{data:JSON.stringify({channel:'ankt.auth',version:1,type:'response',id:request.id,ok:true,
      result:{sessionId:'11111111-1111-4111-8111-111111111111',clientId,origin,environment:'Sandbox',code:'c'.repeat(43),expiresIn:60}})});events.dispatchEvent(event);}};
  globalThis.fetch=async(_url,{signal})=>new Promise((_resolve,reject)=>{started();signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});});
  const sdk=createAnktMiniApp({apiOrigin,hostOrigin,clientId},{events,native,origin});
  try{const login=sdk.init();await exchangeStarted;sdk.dispose();await assert.rejects(login,{code:'AUTH_EXCHANGE_FAILED'});assert.equal(sdk.app.getEnvironment(),null);}
  finally{sdk.dispose();globalThis.fetch=oldFetch;}
});
test('native bootstrap arriving after the first request can retry once with the same PKCE binding',async()=>{
  const events=new EventTarget();let sends=0,id,first;
  const sent=new Promise(resolve=>first=resolve);
  const native={postMessage(raw){sends++;const request=JSON.parse(raw);if(id)assert.equal(request.id,id);id=request.id;first();}};
  const sdk=createAnktMiniApp({apiOrigin,hostOrigin,clientId},{events,native,origin});
  const login=sdk.init();await sent;
  for(let i=0;i<3;i++){const ready=new Event('message');Object.assign(ready,{data:JSON.stringify({channel:'ankt.auth.transport',type:'ready'})});events.dispatchEvent(ready);}
  assert.equal(sends,2);sdk.dispose();await assert.rejects(login,{code:'HOST_UNAVAILABLE'});
});
test('spoofed source/origin cannot supply a launch code',async()=>{
  const events=new EventTarget();const parent={postMessage(data){for(const [source,from] of [[{},hostOrigin],[parent,'https://evil.example']]){
    const event=new Event('message');Object.assign(event,{origin:from,source,data:{channel:'ankt.auth',version:1,type:'response',id:data.id,ok:true,result:{code:'c'.repeat(43)}}});events.dispatchEvent(event);
  }}};
  const sdk=createAnktMiniApp({apiOrigin,hostOrigin,clientId,timeoutMs:50},{events,parent,origin});try{await assert.rejects(sdk.init(),e=>e.code==='HOST_UNAVAILABLE');}finally{sdk.dispose();}
});

for (const [environment, prefix] of [['Production','mas_'],['Sandbox','map_']]) {
  test(`rejects ${prefix} token substitution in a ${environment} session`,async()=>{
    const oldFetch=globalThis.fetch,events=new EventTarget();let exchanges=0;
    const parent={postMessage(data){
      queueMicrotask(()=>{const event=new Event('message');Object.assign(event,{origin:hostOrigin,source:parent,
        data:{channel:'ankt.auth',version:1,type:'response',id:data.id,ok:true,result:{
          sessionId:'11111111-1111-4111-8111-111111111111',clientId,origin,environment,code:'c'.repeat(43),expiresIn:60}}});
      events.dispatchEvent(event);});
    }};
    globalThis.fetch=async(_url,init)=>{exchanges++;const body=JSON.parse(init.body);
      return Response.json({access_token:prefix+'t'.repeat(43),token_type:'Bearer',expires_in:300,scope:'profile',
        session_id:body.session_id,environment});};
    const sdk=createAnktMiniApp({apiOrigin,hostOrigin,clientId},{events,parent,origin});
    try {
      await assert.rejects(sdk.auth.getAccessToken(),{code:'AUTH_EXCHANGE_FAILED'});
      assert.equal(exchanges,1);
    } finally {sdk.dispose();globalThis.fetch=oldFetch;}
  });
}
