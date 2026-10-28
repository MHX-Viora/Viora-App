import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnktMiniApp} from '../dist/host-auth.js';
const clientId='app_'+'a'.repeat(43),apiOrigin='https://api.example',origin='https://partner.example';
const sessionId='11111111-1111-4111-8111-111111111111';
function fixture(hostOrigin,environment='Sandbox',spoof=false){
  const events=new EventTarget(),sent=[];
  const parent={postMessage(data,target){sent.push({data,target});
    const event=new Event('message');Object.assign(event,{source:spoof?{}:parent,origin:hostOrigin,
      data:{channel:'ankt.auth',version:1,type:'response',id:data.id,ok:true,result:{clientId,origin,sessionId,environment,code:'c'.repeat(43),expiresIn:60}}});
    events.dispatchEvent(event);
  }};
  return {runtime:{events,parent,origin},sent};
}
for(const hostOrigin of ['http://localhost:8081','http://127.0.0.1:8081','http://[::1]:8081']){
  test('explicit '+hostOrigin+' can verify only a Sandbox launch over HTTPS API',async()=>{
    const oldFetch=globalThis.fetch,f=fixture(hostOrigin);let exchanges=0;
    globalThis.fetch=async(url)=>{assert.equal(url,apiOrigin+'/api/miniapp/auth/exchange');exchanges++;
      return Response.json({access_token:'mas_'+'t'.repeat(43),token_type:'Bearer',expires_in:300,scope:'profile',session_id:sessionId,environment:'Sandbox'});};
    let sdk;try{sdk=createAnktMiniApp({clientId,apiOrigin,hostOrigin},f.runtime);await sdk.init();
      assert.equal(sdk.app.getEnvironment(),'sandbox');assert.equal(exchanges,1);assert.equal(f.sent[0].target,hostOrigin);
    }finally{sdk?.dispose();globalThis.fetch=oldFetch;}
  });
}
test('loopback host cannot supply a Production code even with a valid response envelope',async()=>{
  const oldFetch=globalThis.fetch;let exchanges=0,sdk;
  globalThis.fetch=async()=>{exchanges++;throw Error('must not exchange');};
  try{const hostOrigin='http://localhost:8081',f=fixture(hostOrigin,'Production');sdk=createAnktMiniApp({clientId,apiOrigin,hostOrigin},f.runtime);
    await assert.rejects(sdk.init(),{code:'SANDBOX_HOST_ONLY'});assert.equal(exchanges,0);assert.equal(sdk.app.getEnvironment(),null);
  }finally{sdk?.dispose();globalThis.fetch=oldFetch;}
});
test('loopback exception never permits insecure API or deceptive/nonloopback host origins',()=>{
  for(const hostOrigin of ['http://localhost.evil.example:8081','http://127.0.0.2:8081','http://192.168.1.2:8081','http://host.example',
    'http://localhost:8081/path','http://localhost:8081/','http://user@localhost:8081','http://localhost:8081?host=1','*']){
    assert.throws(()=>createAnktMiniApp({clientId,hostOrigin}),{code:'INVALID_ORIGIN'});
  }
  assert.throws(()=>createAnktMiniApp({clientId,apiOrigin:'http://localhost:5000',hostOrigin:'http://localhost:8081'}),{code:'INVALID_ORIGIN'});
});
test('even on loopback a forged parent source is ignored',async()=>{
  let sdk;try{const hostOrigin='http://localhost:8081',f=fixture(hostOrigin,'Sandbox',true);
    sdk=createAnktMiniApp({clientId,apiOrigin,hostOrigin,timeoutMs:50},f.runtime);
    await assert.rejects(sdk.init(),{code:'HOST_UNAVAILABLE'});
  }finally{sdk?.dispose();}
});
test('same parent on a different loopback port cannot complete the handshake',async()=>{
  const events=new EventTarget(),hostOrigin='http://localhost:8081';
  const parent={postMessage(data){const event=new Event('message');Object.assign(event,{source:parent,origin:'http://localhost:8082',
    data:{channel:'ankt.auth',version:1,type:'response',id:data.id,ok:true,result:{clientId,origin,sessionId,environment:'Sandbox',code:'c'.repeat(43),expiresIn:60}}});events.dispatchEvent(event);}};
  const sdk=createAnktMiniApp({clientId,apiOrigin,hostOrigin,timeoutMs:50},{events,parent,origin});
  try{await assert.rejects(sdk.init(),{code:'HOST_UNAVAILABLE'});}finally{sdk.dispose();}
});
