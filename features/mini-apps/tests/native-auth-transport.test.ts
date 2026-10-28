import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createNativeAuthTransport} from '../lib/native-auth-transport';
const url='https://mini.example/start',nonce='a'.repeat(43);
test('native channel rejects raw subframe messages, wrong document secret and URL redirects',()=>{
  const channel=createNativeAuthTransport(url,nonce),data={method:'auth.login'};
  for(const event of [{url,data:JSON.stringify(data)},{url,data:JSON.stringify({nonce:'b'.repeat(43),data:JSON.stringify(data)})},
    {url:'https://evil.example/start',data:JSON.stringify({nonce,data:JSON.stringify(data)})},
    {url:url+'?redirect=1',data:JSON.stringify({nonce,data:JSON.stringify(data)})}])assert.equal(channel.receive(event),undefined);
  assert.deepEqual(channel.receive({url,data:JSON.stringify({nonce,data:JSON.stringify(data)})}),data);
  channel.dispose();assert.equal(channel.receive({url,data:JSON.stringify({nonce,data:'{}'})}),undefined);
});
test('top document bootstrap wraps native messages and host injection refuses a navigated document',()=>{
  const channel=createNativeAuthTransport(url,nonce),sent:string[]=[],received:unknown[]=[];
  const window={top:null as unknown,ReactNativeWebView:{postMessage:(data:string)=>sent.push(data)},dispatchEvent:(event:unknown)=>received.push(event)};window.top=window;
  const context=vm.createContext({window,location:{href:url},MessageEvent:class {constructor(public type:string,public init:unknown){}}});
  vm.runInContext(channel.bootstrap,context);vm.runInContext(channel.bootstrap,context);
  window.ReactNativeWebView.postMessage('{"hello":true}');
  assert.deepEqual(channel.receive({url,data:sent[0]}),{hello:true});assert.equal(received.length,1);
  vm.runInContext(channel.injection({code:'secret'}),context);assert.equal(received.length,2);
  context.location.href='https://evil.example/';vm.runInContext(channel.injection({code:'secret'}),context);assert.equal(received.length,2);
});
test('bootstrap does not expose the top document nonce to a child frame',()=>{
  const channel=createNativeAuthTransport(url,nonce);
  const window={top:{},ReactNativeWebView:{postMessage:()=>{throw Error('child frame called native');}}};
  vm.runInNewContext(channel.bootstrap,{window,location:{href:url}});
  assert.equal(Object.hasOwn(window,'__anktAuthDocument'),false);
});
