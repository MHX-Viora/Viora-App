import assert from 'node:assert/strict';
import test from 'node:test';
import {connectHostBridge,SdkError} from '../dist/index.js';

function fixture() {
  const events=new EventTarget();const requests=[];
  const parent={postMessage:(message,origin)=>requests.push({message,origin})};
  const respond=(request,result,overrides={})=>{
    const event=new Event('message');
    Object.assign(event,{origin:'https://host.example',source:parent,data:{channel:'ankt.miniapp',version:request.message.version,type:'response',id:request.message.id,ok:true,result},...overrides});
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

test('v2 explicitly negotiates Sandbox capabilities and bounds method parameters',async()=>{
  const f=fixture();const pending=connectHostBridge('https://host.example',{...f.options,protocolVersion:2});
  assert.equal(f.requests[0].message.version,2);
  f.respond(f.requests[0],{permissions:['platform.getContext','platform.getEnvironment','platform.isInsideAnkt','platform.close','platform.openExternalUrl','diagnostics.report']});
  const bridge=await pending;
  const environment=bridge.getEnvironment();f.respond(f.requests.at(-1),'Sandbox');assert.equal(await environment,'Sandbox');
  const inside=bridge.isInsideAnkt();f.respond(f.requests.at(-1),true);assert.equal(await inside,true);
  const external=bridge.openExternalUrl('https://partner.example.com/help');assert.deepEqual(f.requests.at(-1).message.params,{url:'https://partner.example.com/help'});
  f.respond(f.requests.at(-1),null);await external;
  const diagnostic=bridge.reportDiagnostic({category:'Runtime',code:'RUNTIME_READY',count:1});
  assert.deepEqual(f.requests.at(-1).message.params,{category:'Runtime',code:'RUNTIME_READY',count:1});f.respond(f.requests.at(-1),null);await diagnostic;
  const count=f.requests.length;
  for(const url of ['javascript:alert(1)','https://user:password@partner.example.com','https://partner.example.com/?access_token=secret','https://partner.example.com/#secret'])
    await assert.rejects(()=>bridge.openExternalUrl(url),e=>e.code==='INVALID_CONFIG');
  await assert.rejects(()=>bridge.reportDiagnostic({category:'Runtime',code:'RUNTIME_READY',access_token:'never-send'}),e=>e.code==='INVALID_CONFIG');
  assert.equal(f.requests.length,count);bridge.dispose();
});

test('v1 never advertises or executes v2 platform methods',async()=>{
  const f=fixture();const pending=connectHostBridge('https://host.example',f.options);
  f.respond(f.requests[0],{permissions:['platform.getContext','platform.close']});const bridge=await pending;
  const environment=bridge.getEnvironment();
  assert.equal(f.requests.at(-1).message.method,'platform.getContext');
  f.respond(f.requests.at(-1),{appId:'app_test',environment:'Production',runtime:'controlled-web'});
  assert.equal(await environment,'Production');
  assert.equal(await bridge.isInsideAnkt(),true);
  assert.equal(f.requests.length,2);bridge.dispose();
  assert.equal(await bridge.isInsideAnkt(),false);
});

test('v2 rejects duplicate permissions and non-Sandbox environment without accepting error payload secrets',async()=>{
  const f=fixture();const pending=connectHostBridge('https://host.example',{...f.options,protocolVersion:2});
  f.respond(f.requests[0],{permissions:['platform.close','platform.close']});await assert.rejects(()=>pending,e=>e.code==='BRIDGE_PROTOCOL');
  const g=fixture();const handshake=connectHostBridge('https://host.example',{...g.options,protocolVersion:2});
  g.respond(g.requests[0],{permissions:['platform.getEnvironment','platform.openExternalUrl']});const bridge=await handshake;
  const environment=bridge.getEnvironment();g.respond(g.requests.at(-1),'Production');await assert.rejects(()=>environment,e=>e.code==='BRIDGE_PROTOCOL');
  const external=bridge.openExternalUrl('https://partner.example.com/help');
  const request=g.requests.at(-1);g.respond(request,null,{data:{channel:'ankt.miniapp',version:2,type:'response',id:request.message.id,ok:false,error:{code:'BRIDGE_FORBIDDEN'}}});
  await assert.rejects(()=>external,e=>e.code==='BRIDGE_FORBIDDEN'&&!e.message.includes('help'));bridge.dispose();
});
test('page navigation rejects outstanding calls and removes transport',async()=>{
  const f=fixture();const pending=connectHostBridge('https://host.example',f.options);
  f.respond(f.requests[0],{permissions:['platform.getContext']});const session=await pending;
  const context=session.getContext();f.events.dispatchEvent(new Event('pagehide'));
  await assert.rejects(()=>context,e=>e.code==='BRIDGE_DISPOSED');
  await assert.rejects(()=>session.getContext(),e=>e.code==='BRIDGE_DISPOSED');
});

test('successful close disposes the verified connection and rejects pending work',async()=>{
  const f=fixture();const pending=connectHostBridge('https://host.example',{...f.options,protocolVersion:2});
  f.respond(f.requests[0],{permissions:['platform.close','platform.getContext']});const session=await pending;
  const context=session.getContext();const rejected=assert.rejects(()=>context,e=>e.code==='BRIDGE_DISPOSED');
  const closing=session.close();f.respond(f.requests.at(-1),null);await closing;
  assert.equal(session.insideHost,false);await rejected;
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
