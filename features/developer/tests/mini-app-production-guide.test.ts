import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {productionIntegrationHtml, productionLoginScript, productionMiniApp} from '../lib/mini-app-production-guide';
import snippets from '../docs/reference/example-snippets.json';

test('published and copied examples share a versioned production bootstrap', () => {
  assert.equal(snippets.publicClient,productionLoginScript());
  const html=productionIntegrationHtml('app_'+'x'.repeat(43));
  assert.ok(html.includes(`ankt-miniapp.js?v=${productionMiniApp.sdkVersion}`));
  assert.ok(!html.includes('localhost'));
  assert.ok(!html.includes('onrender.com'),'production copy must not expose a provider hostname');
  assert.throws(()=>productionIntegrationHtml('</script>'));
  assert.throws(()=>productionIntegrationHtml(undefined,'../old-sdk'));
});

for(const ok of [true,false])test(`production example ${ok?'delivers partner session':'reports partner failure'} even when Portal is local`,async()=>{
  let options: Record<string,unknown> | undefined;
  let request: {url:string;init:RequestInit} | undefined;
  let issued=0,disposed=false;
  let pagehide: (()=>void) | undefined;
  let complete!: (event:{type:string;detail:unknown})=>void;
  const outcome=new Promise<{type:string;detail:unknown}>(resolve=>{complete=resolve;});
  const session={user:{id:'partner-user'},authenticated:true};
  const context={
    window:{location:{origin:'http://localhost:8081'},ANKTMiniApp:{create(value:Record<string,unknown>){options=value;return {
      init:async()=>undefined,auth:{getLoginCode:async()=>{issued++;return {code:'c'.repeat(43),expiresIn:60};}},dispose(){disposed=true;},
    };}},addEventListener(name:string,handler:()=>void){if(name==='pagehide')pagehide=handler;}},
    document:{dispatchEvent(event:{type:string;detail:unknown}){complete(event);}},
    CustomEvent:class {constructor(public type:string,public options:{detail:unknown}){}get detail(){return this.options.detail;}},
    AbortSignal,fetch:async(url:string,init:RequestInit)=>{request={url,init};return {ok,json:async()=>session};},
  };
  vm.runInNewContext(productionLoginScript('app_'+'x'.repeat(43)),context);
  const event=await outcome;
  assert.equal(options?.hostOrigin,'https://mxh.ankt.vn');
  assert.equal(options?.apiOrigin,productionMiniApp.apiOrigin);
  assert.equal(options?.apiOrigin,'https://api.mxh.ankt.vn');
  assert.equal(issued,1);
  assert.equal(request?.url,'/api/auth/ankt/exchange');
  assert.equal(request?.init.body,JSON.stringify({code:'c'.repeat(43)}));
  assert.equal(request?.init.redirect,'error');
  assert.equal(event.type,ok?'ankt:partner-login':'ankt:login-error');
  if(ok)assert.equal(event.detail,session);
  pagehide?.();assert.equal(disposed,true);
});
