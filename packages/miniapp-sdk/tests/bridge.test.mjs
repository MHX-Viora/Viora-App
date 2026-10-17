import assert from 'node:assert/strict';
import test from 'node:test';
import {connectHostBridge,SdkError} from '../dist/index.js';

function fixture() {
  const events=new EventTarget();const requests=[];
  const parent={postMessage:(message,origin)=>requests.push({message,origin})};
  const respond=(request,result,overrides={})=>{
    const event=new Event('message');
    Object.assign(event,{origin:'https://host.example',source:parent,data:{channel:'ankt.miniapp',version:1,type:'response',id:request.message.id,ok:true,result},...overrides});
    events.dispatchEvent(event);
  };
  return {events,parent,requests,respond,options:{timeoutMs:100,runtime:{events,parent}}};
}
test('verified handshake requires exact origin/source, unpredictable ID and schema',async()=>{
  const f=fixture();const pending=connectHostBridge('https://host.example',f.options);const request=f.requests[0];
  assert.equal(request.origin,'https://host.example');assert.ok(request.message.id.length>=32);
  f.respond(request,{permissions:['platform.getContext']},{origin:'https://evil.example'});
  f.respond(request,{permissions:['platform.getContext']},{source:{}});
  const bridge=await Promise.race([pending.then(()=>assert.fail('Spoof accepted')),Promise.resolve(null)]);
  assert.equal(bridge,null);
  f.respond(request,{permissions:['platform.getContext']});const session=await pending;assert.equal(session.insideHost,true);
  const context=session.getContext();f.respond(f.requests[1],{appId:'app_test',environment:'Sandbox',runtime:'controlled-web'});
  assert.equal((await context).appId,'app_test');
  await assert.rejects(()=>session.close(),e=>e.code==='UNSUPPORTED_METHOD');
  session.dispose();assert.equal(session.insideHost,false);
});
test('page navigation rejects outstanding calls and removes transport',async()=>{
  const f=fixture();const pending=connectHostBridge('https://host.example',f.options);
  f.respond(f.requests[0],{permissions:['platform.getContext']});const session=await pending;
  const context=session.getContext();f.events.dispatchEvent(new Event('pagehide'));
  await assert.rejects(()=>context,e=>e.code==='BRIDGE_DISPOSED');
  await assert.rejects(()=>session.getContext(),e=>e.code==='BRIDGE_DISPOSED');
});
test('timeout and malformed handshake fail closed',async()=>{
  const f=fixture();
  await assert.rejects(()=>connectHostBridge('https://host.example',{...f.options,timeoutMs:10}),e=>e.code==='BRIDGE_TIMEOUT');
  const g=fixture();const pending=connectHostBridge('https://host.example',g.options);
  g.respond(g.requests[0],{permissions:['platform.nativeLogin']});
  await assert.rejects(()=>pending,e=>e.code==='BRIDGE_PROTOCOL');
});
test('bridge rejects credential-bearing context and bounds pending requests',async()=>{
  const f=fixture();const pending=connectHostBridge('https://host.example',f.options);
  f.respond(f.requests[0],{permissions:['platform.getContext']});const session=await pending;
  const invalid=session.getContext();f.respond(f.requests[1],{appId:'app_test',environment:'Sandbox',runtime:'controlled-web',access_token:'never-allowed'});
  await assert.rejects(()=>invalid,e=>e.code==='BRIDGE_PROTOCOL');
  const calls=Array.from({length:32},()=>session.getContext());
  await assert.rejects(()=>session.getContext(),e=>e.code==='BRIDGE_BUSY');
  const done=Promise.allSettled(calls);session.dispose();
  assert.ok((await done).every(x=>x.status==='rejected'));
});
test('wildcard/insecure host origins are rejected',async()=>{
  for(const origin of ['*','http://host.example','https://host.example/path','https://host.example?token=x'])
    await assert.rejects(()=>connectHostBridge(origin,fixture().options),SdkError);
});
test('context schema rejects arrays disguised as environment strings',async()=>{
  const f=fixture();const pending=connectHostBridge('https://host.example',f.options);
  f.respond(f.requests[0],{permissions:['platform.getContext']});const session=await pending;
  const context=session.getContext();f.respond(f.requests[1],{appId:'app_test',environment:['Sandbox'],runtime:'controlled-web'});
  await assert.rejects(()=>context,e=>e.code==='BRIDGE_PROTOCOL');session.dispose();
});
