import assert from 'node:assert/strict';
import test from 'node:test';
import { createSandboxTransport } from '../lib/sandbox-transport';

test('Portal transport binds grants to the exact current host, nonce and session and sends once', async () => {
  const source = {}, sent: unknown[] = [], statuses: string[] = []; let issued = 0;
  const transport = createSandboxTransport({ hostOrigin:'https://sandbox.ankt.vn', portalOrigin:'https://portal.ankt.vn', sessionId:'11111111-1111-4111-8111-111111111111',
    source:()=>source, launch:async()=>{issued++;return {grant:'g'.repeat(43),expiresAt:new Date(Date.now()+30000).toISOString()};},
    send:value=>sent.push(value), status:value=>statuses.push(value) });
  const data = {channel:'ankt.sandbox.host',version:1,type:'host.ready',sessionId:'11111111-1111-4111-8111-111111111111',browserNonce:'n'.repeat(43)};
  await transport.handle({origin:'https://evil.example',source,data});
  await transport.handle({origin:'https://sandbox.ankt.vn',source:{},data});
  await transport.handle({origin:'https://sandbox.ankt.vn',source,data:{...data,token:'secret'}});
  assert.equal(issued,0);
  await Promise.all([transport.handle({origin:'https://sandbox.ankt.vn',source,data}), transport.handle({origin:'https://sandbox.ankt.vn',source,data})]);
  assert.equal(issued,1); assert.equal(sent.length,1);
  assert.deepEqual(sent[0], {...data,type:'launch',grant:'g'.repeat(43)});
  await transport.handle({origin:'https://sandbox.ankt.vn',source,data:{channel:data.channel,version:1,type:'bridge.connected',sessionId:data.sessionId}});
  assert.ok(statuses.includes('bridge.connected'));
  transport.command('host.reload'); assert.equal(sent.length,2);
  transport.dispose(); transport.command('host.stop'); assert.equal(sent.length,2);
});
test('disposed transports discard grants still in flight and reject unsafe host configuration', async () => {
  for(const hostOrigin of ['http://host.example','https://portal.ankt.vn','https://host.example/path','https://user:secret@host.example'])
    assert.throws(()=>createSandboxTransport({hostOrigin,portalOrigin:'https://portal.ankt.vn',sessionId:'id',source:()=>null,launch:async()=>{throw Error();},send:()=>{},status:()=>{}}));
  let complete!: (value:{grant:string;expiresAt:string})=>void; const sent:unknown[]=[]; const source={};
  const transport=createSandboxTransport({hostOrigin:'https://sandbox.ankt.vn',portalOrigin:'https://portal.ankt.vn',sessionId:'id',source:()=>source,
    launch:()=>new Promise(resolve=>{complete=resolve;}),send:v=>sent.push(v),status:()=>{}});
  const pending=transport.handle({origin:'https://sandbox.ankt.vn',source,data:{channel:'ankt.sandbox.host',version:1,type:'host.ready',sessionId:'id',browserNonce:'n'.repeat(43)}});
  transport.dispose(); complete({grant:'g'.repeat(43),expiresAt:new Date(Date.now()+30000).toISOString()}); await pending; assert.equal(sent.length,0);
});
