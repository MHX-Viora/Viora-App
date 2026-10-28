import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnktMiniApp} from '../dist/host-auth.js';
const clientId='app_'+'a'.repeat(43),origin='https://partner.example',hostOrigin='https://host.example';

for(const transport of ['iframe','Android','iOS'])test(`${transport}: partner login code uses the verified Bridge and never sends a client secret`,async()=>{
  const original=globalThis.fetch,events=new EventTarget(),documentEvents=new EventTarget();
  let launches=0,codes=0;
  const parent={postMessage(message,target){assert.equal(target,hostOrigin);reply(message);}};
  function reply(message){
    launches++;
    const data={channel:'ankt.auth',version:1,type:'response',id:message.id,ok:true,result:{
      sessionId:'11111111-1111-4111-8111-111111111111',clientId,origin,environment:'Sandbox',code:'c'.repeat(43),expiresIn:60}};
    const event=new Event('message');Object.assign(event,transport==='iframe'?{origin:hostOrigin,source:parent,data}:{data:JSON.stringify(data)});
    (transport==='iOS'?documentEvents:events).dispatchEvent(event);
  }
  const native={postMessage(raw){reply(JSON.parse(raw));}};
  globalThis.fetch=async(url,init)=>{
    assert.ok(!JSON.stringify(init).toLowerCase().includes('secret'));
    if(url.endsWith('/exchange'))return Response.json({access_token:'mas_'+'t'.repeat(43),token_type:'Bearer',expires_in:300,
      scope:'profile',session_id:JSON.parse(init.body).session_id,environment:'Sandbox'});
    assert.ok(url.endsWith('/code'));assert.equal(init.headers.Authorization,'Bearer mas_'+'t'.repeat(43));
    codes++;return Response.json({code:(codes===1?'x':'y').repeat(43),expiresIn:60});
  };
  const sdk=createAnktMiniApp({clientId,hostOrigin},{events,documentEvents,origin,...(transport==='iframe'?{parent}:{native})});
  try{
    assert.deepEqual(await sdk.auth.getLoginCode(),{code:'x'.repeat(43),expiresIn:60});
    assert.deepEqual(await sdk.auth.getLoginCode(),{code:'y'.repeat(43),expiresIn:60});
    assert.equal(launches,1);assert.equal(codes,2);
    sdk.dispose();await assert.rejects(sdk.auth.getLoginCode(),{code:'HOST_UNAVAILABLE'});
  }finally{sdk.dispose();globalThis.fetch=original;}
});

test('malformed or failed code issuance is rejected and an explicit retry can succeed',async()=>{
  const original=globalThis.fetch,events=new EventTarget();let mode='malformed';
  const native={postMessage(raw){const message=JSON.parse(raw),event=new Event('message');
    Object.assign(event,{data:JSON.stringify({channel:'ankt.auth',version:1,type:'response',id:message.id,ok:true,
      result:{sessionId:'11111111-1111-4111-8111-111111111111',clientId,origin,environment:'Sandbox',code:'c'.repeat(43),expiresIn:60}})});events.dispatchEvent(event);}};
  globalThis.fetch=async(url,init)=>url.endsWith('/exchange')?Response.json({access_token:'mas_'+'t'.repeat(43),token_type:'Bearer',expires_in:300,
    scope:'profile',session_id:JSON.parse(init.body).session_id,environment:'Sandbox'}):mode==='offline'?Promise.reject(Error('offline')):
    Response.json({code:'x'.repeat(43),expiresIn:mode==='malformed'?61:60});
  const sdk=createAnktMiniApp({clientId,hostOrigin},{events,native,origin});
  try{
    await assert.rejects(sdk.auth.getLoginCode(),{code:'AUTH_EXCHANGE_FAILED'});
    mode='offline';await assert.rejects(sdk.auth.getLoginCode(),{code:'AUTH_EXCHANGE_FAILED'});
    mode='ok';assert.equal((await sdk.auth.getLoginCode()).expiresIn,60);
  }finally{sdk.dispose();globalThis.fetch=original;}
});
