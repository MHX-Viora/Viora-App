import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createNativeAuthTransport} from '../lib/native-auth-transport';
const url='https://mini.example/start',nonce='a'.repeat(43);
const documentId='22222222-2222-4222-8222-222222222222',nextDocumentId='33333333-3333-4333-8333-333333333333';
const documentMessage={channel:'ankt.auth.transport',type:'document'};
const envelope=(data:unknown,id=documentId,key=nonce)=>JSON.stringify({nonce:key,documentId:id,data:JSON.stringify(data)});
const bind=(channel:ReturnType<typeof createNativeAuthTransport>,id=documentId)=>channel.receive({url,data:envelope(documentMessage,id)});

test('Android origin-only message metadata requires the bound top-document nonce and instance',()=>{
  const channel=createNativeAuthTransport(url,nonce),data={method:'auth.login'};
  const origin='https://mini.example';
  assert.equal(channel.receive({url:origin,data:envelope(documentMessage)}),undefined);
  assert.deepEqual(channel.receive({url:origin,data:envelope(data)}),data);
  assert.equal(channel.receive({url:origin,data:JSON.stringify(data)}),undefined);
  assert.equal(channel.receive({url:origin,data:envelope(data,documentId,'b'.repeat(43))}),undefined);
  assert.equal(channel.receive({url:'https://evil.example',data:envelope(data)}),undefined);
  assert.equal(channel.matches(origin),true,'the configured HTTPS origin can host multiple Mini App routes');
  channel.dispose();assert.equal(channel.receive({url:origin,data:envelope(data)}),undefined);
});
test('native channel rejects raw subframe messages, wrong document secret and foreign origins',()=>{
  const channel=createNativeAuthTransport(url,nonce),data={method:'auth.login'};
  bind(channel);
  for(const event of [{url,data:JSON.stringify(data)},{url,data:envelope(data,documentId,'b'.repeat(43))},
    {url:'https://evil.example/start',data:envelope(data)},
    {url:'https://mini.example.evil/start',data:envelope(data)},
    {url,data:JSON.stringify({nonce,data:JSON.stringify(data)})}])assert.equal(channel.receive(event),undefined);
  assert.deepEqual(channel.receive({url,data:envelope(data)}),data);
  channel.dispose();assert.equal(channel.receive({url,data:envelope({})}),undefined);
});

test('native navigation permits routes only inside the configured HTTPS origin',()=>{
  const channel=createNativeAuthTransport(url,nonce);
  for(const route of ['/','/news','/community?tab=latest#posts'])assert.equal(channel.matches('https://mini.example'+route),true);
  for(const target of ['https://evil.example/start','https://mini.example.evil/start','http://mini.example/start',
    'https://mini.example:444/start','https://user:password@mini.example/news','javascript:alert(1)','not a URL'])assert.equal(channel.matches(target),false);
  channel.dispose();assert.equal(channel.matches('https://mini.example/news'),false);
});

test('SPA tab changes preserve bound messages and replies without exposing grants to another document',()=>{
  const channel=createNativeAuthTransport(url,nonce),sent:string[]=[],received:unknown[]=[];
  const crypto={randomUUID:()=>documentId};
  const window={top:null as unknown,crypto,ReactNativeWebView:{postMessage:(data:string)=>sent.push(data)},dispatchEvent:(event:unknown)=>received.push(event)};window.top=window;
  const context=vm.createContext({window,crypto,location:{href:url,origin:'https://mini.example'},MessageEvent:class {constructor(public type:string,public init:unknown){}}});
  vm.runInContext(channel.bootstrap,context);channel.receive({url,data:sent[0]});
  context.location.href='https://mini.example/community?tab=latest#posts';
  vm.runInContext(channel.bootstrap,context);
  assert.equal(sent.length,1,'changing a SPA tab must keep the same document binding');
  window.ReactNativeWebView.postMessage(JSON.stringify({method:'auth.login'}));
  assert.deepEqual(channel.receive({url:context.location.href,data:sent[1]}),{method:'auth.login'});
  vm.runInContext(channel.injection({code:'secret'}),context);
  assert.equal(received.length,2,'the same document must still receive host replies after switching tabs');
  context.location.href='https://evil.example/';context.location.origin='https://evil.example';
  vm.runInContext(channel.injection({code:'secret'}),context);assert.equal(received.length,2);
});

test('authentication cannot bind a document, and untrusted document announcements cannot replace it',()=>{
  let replaced=0;
  const channel=createNativeAuthTransport(url,nonce,()=>{replaced++;});
  assert.equal(channel.receive({url,data:envelope({method:'auth.login'})}),undefined);
  assert.equal(channel.injection({code:'secret'}),'true;');
  assert.equal(bind(channel),undefined);
  assert.equal(bind(channel),undefined,'same document announcement is idempotent');
  for(const event of [{url:'https://evil.example',data:envelope(documentMessage,nextDocumentId)},
    {url,data:envelope(documentMessage,nextDocumentId,'b'.repeat(43))},
    {url,data:envelope(documentMessage,'not-a-document-id')}])assert.equal(channel.receive(event),undefined);
  assert.equal(replaced,0);
  assert.deepEqual(channel.receive({url,data:envelope({method:'auth.login'})}),{method:'auth.login'});
});

test('a new document at the same URL closes the old channel before authentication or replies',()=>{
  let replaced=0;
  const channel=createNativeAuthTransport(url,nonce,()=>{replaced++;});
  bind(channel);
  assert.deepEqual(channel.receive({url,data:envelope({method:'auth.login'})}),{method:'auth.login'});
  assert.equal(bind(channel,nextDocumentId),undefined);
  assert.equal(replaced,1);
  assert.equal(channel.matches(url),false);
  assert.equal(channel.receive({url,data:envelope({method:'auth.login'},nextDocumentId)}),undefined);
  assert.equal(channel.receive({url,data:envelope({method:'auth.login'})}),undefined);
  assert.equal(channel.injection({code:'secret'}),'true;');
  bind(channel,nextDocumentId);assert.equal(replaced,1,'replacement closes only once');
});
test('top document bootstrap wraps native messages and host injection refuses a navigated document',()=>{
  const channel=createNativeAuthTransport(url,nonce),sent:string[]=[],received:unknown[]=[];
  const crypto={randomUUID:()=>documentId};
  const window={top:null as unknown,crypto,ReactNativeWebView:{postMessage:(data:string)=>sent.push(data)},dispatchEvent:(event:unknown)=>received.push(event)};window.top=window;
  const context=vm.createContext({window,crypto,location:{href:url,origin:'https://mini.example'},MessageEvent:class {constructor(public type:string,public init:unknown){}}});
  vm.runInContext(channel.bootstrap,context);vm.runInContext(channel.bootstrap,context);
  assert.deepEqual(JSON.parse(sent[0]),{nonce,documentId,data:JSON.stringify(documentMessage)});
  vm.runInContext(channel.injection({code:'secret'}),context);assert.equal(received.length,1,'unbound document cannot receive a grant');
  assert.equal(channel.receive({url,data:sent[0]}),undefined);
  window.ReactNativeWebView.postMessage('{"hello":true}');
  assert.equal(sent.length,2,'repeated bootstrap must not announce a second document');
  assert.deepEqual(channel.receive({url,data:sent[1]}),{hello:true});assert.equal(received.length,1);
  vm.runInContext(channel.injection({code:'secret'}),context);assert.equal(received.length,2);
  context.location.href='https://evil.example/';context.location.origin='https://evil.example';vm.runInContext(channel.injection({code:'secret'}),context);assert.equal(received.length,2);
});

test('host replies refuse a replacement document even before its announcement reaches native',()=>{
  const channel=createNativeAuthTransport(url,nonce),sent:string[]=[],received:unknown[]=[];
  const crypto={randomUUID:()=>nextDocumentId};
  const window={top:null as unknown,crypto,ReactNativeWebView:{postMessage:(data:string)=>sent.push(data)},dispatchEvent:(event:unknown)=>received.push(event)};window.top=window;
  bind(channel);
  const context=vm.createContext({window,crypto,location:{href:url,origin:'https://mini.example'},MessageEvent:class {constructor(public type:string,public init:unknown){}}});
  vm.runInContext(channel.bootstrap,context);
  assert.equal(received.length,1);
  vm.runInContext(channel.injection({code:'secret'}),context);
  assert.equal(received.length,1,'a newly bootstrapped document must not receive the previous document grant');
});
test('bootstrap does not expose the top document nonce to a child frame',()=>{
  const channel=createNativeAuthTransport(url,nonce);
  const window={top:{},ReactNativeWebView:{postMessage:()=>{throw Error('child frame called native');}}};
  vm.runInNewContext(channel.bootstrap,{window,location:{href:url}});
  assert.equal(Object.hasOwn(window,'__anktAuthDocument'),false);
});

test('replacement documents on another allowed route revoke the binding and cannot receive old grants',()=>{
  let replaced=0;
  const channel=createNativeAuthTransport(url,nonce,()=>{replaced++;}),sent:string[]=[],received:unknown[]=[];
  bind(channel);
  const crypto={randomUUID:()=>nextDocumentId},route='https://mini.example/news';
  const window={top:null as unknown,ReactNativeWebView:{postMessage:(data:string)=>sent.push(data)},dispatchEvent:(event:unknown)=>received.push(event)};window.top=window;
  const context=vm.createContext({window,crypto,location:{href:route,origin:'https://mini.example'},MessageEvent:class {constructor(public type:string,public init:unknown){}}});
  vm.runInContext(channel.bootstrap,context);
  assert.equal(sent.length,1,'a new document must announce itself even on another route');
  vm.runInContext(channel.injection({code:'secret'}),context);
  assert.equal(received.length,1,'the new document cannot receive the previous document grant');
  channel.receive({url:route,data:sent[0]});assert.equal(replaced,1);
  assert.equal(channel.injection({code:'secret'}),'true;');
});

test('bootstrap does not expose its binding to a top document on a foreign origin',()=>{
  const channel=createNativeAuthTransport(url,nonce);
  const window={top:null as unknown,ReactNativeWebView:{postMessage:()=>{throw Error('foreign origin called native');}}};window.top=window;
  vm.runInNewContext(channel.bootstrap,{window,location:{href:'https://evil.example/start',origin:'https://evil.example'}});
  assert.equal(Object.hasOwn(window,'__anktAuthDocument'),false);
});
