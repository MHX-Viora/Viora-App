import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthBridgeHost} from '../lib/auth-bridge-host';
const clientId='app_'+'a'.repeat(43),origin='https://partner.example',source={};
const message=()=>({channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.login',params:{clientId,codeChallenge:'a'.repeat(43)}});
const launch={sessionId:'11111111-1111-4111-8111-111111111111',code:'c'.repeat(43),expiresIn:60,clientId,origin,environment:'Sandbox'};
test('host ignores forged source/origin and rejects client identity substitution',async()=>{
  let grants=0;const replies:unknown[]=[],failures:string[]=[];
  const host=createAuthBridgeHost({clientId,origin,source:()=>source,send:x=>replies.push(x),launch:async()=>{grants++;return launch;},revoke:async()=>{},status:(_state,code)=>{if(code)failures.push(code);}});
  await host.handle({source:{},origin,data:message()});await host.handle({source,origin:'https://evil.example',data:message()});
  assert.equal(grants,0);const bad=message();bad.params.clientId='other';await host.handle({source,origin,data:bad});assert.equal(grants,0);assert.equal(replies.length,1);
  assert.deepEqual(failures,['INVALID_CLIENT'],'report the identity mismatch instead of leaving the preview waiting for a handshake');host.dispose();
});
test('host sends code only after handshake, refuses replay and revokes sessions when closed',async()=>{
  const replies:unknown[]=[],statuses:string[]=[],revoked:string[]=[];
  const host=createAuthBridgeHost({clientId,origin,source:()=>source,send:x=>replies.push(x),launch:async()=>launch,revoke:async id=>{revoked.push(id);},status:x=>statuses.push(x)});
  const request=message();await host.handle({source,origin,data:request});assert.equal(replies.length,1);assert.equal(statuses.at(-1),'Authenticating');
  await host.handle({source,origin,data:{...message(),method:'auth.ready',params:{clientId,sessionId:launch.sessionId}}});assert.equal(statuses.at(-1),'Connected');
  await host.handle({source,origin,data:request});assert.equal(replies.length,2);host.dispose();assert.deepEqual(revoked,[launch.sessionId]);
});
test('navigation/unmount during launch cannot deliver a stale code',async()=>{
  let finish!:(value:typeof launch)=>void;const replies:unknown[]=[],revoked:string[]=[];
  const host=createAuthBridgeHost({clientId,origin,source:()=>source,send:x=>replies.push(x),launch:()=>new Promise(resolve=>{finish=resolve;}),revoke:async id=>{revoked.push(id);},status:()=>{}});
  const pending=host.handle({source,origin,data:message()});host.dispose();finish(launch);await pending;assert.equal(replies.length,0);assert.deepEqual(revoked,[launch.sessionId]);
});
test('only a previously bound session may close the host',async()=>{
  let closed=0;const statuses:string[]=[];
  const host=createAuthBridgeHost({clientId,origin,source:()=>source,send:()=>{},launch:async()=>launch,revoke:async()=>{},status:state=>statuses.push(state),close:()=>{closed++;}});
  const close={...message(),method:'auth.close',params:{clientId,sessionId:launch.sessionId}};
  await host.handle({source,origin,data:close});assert.equal(closed,0);
  await host.handle({source,origin,data:message()});
  await host.handle({source:{},origin,data:close});assert.equal(closed,0);
  await host.handle({source,origin,data:close});assert.equal(closed,1);assert.equal(statuses.at(-1),'Closed');host.dispose();
});
