import test from 'node:test';
import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import Module,{createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript');
const clientId='app_'+'a'.repeat(43),url='https://mini.example/start',origin='https://mini.example';
const documentId='22222222-2222-4222-8222-222222222222';
const envelope=(data,id=documentId)=>JSON.stringify({nonce:Buffer.alloc(32,1).toString('base64url'),documentId:id,data:JSON.stringify(data)});
const bindDocument=(web,platform='ios',id=documentId)=>web.props.onMessage({nativeEvent:{url:platform==='android'?origin:url,
  data:envelope({channel:'ankt.auth.transport',type:'document'},id)}});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(platform='ios'){
  const filename=fileURLToPath(new URL('../adapters/auth-host.native.tsx',import.meta.url)),localRequire=createRequire(filename);
  const refs=[],effects=[],statuses=[],injections=[],requests=[],sessionListeners=new Set();let cursor=0,state=null,stops=0,onAppState;
  const overrides={
    react:{useRef:value=>refs[cursor++]??(refs[cursor-1]={current:value}),useState:()=>[state,value=>state=value],useEffect:callback=>effects.push(callback)},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props})},
    'react-native':{View:'View',Platform:{OS:platform},AppState:{addEventListener:(_type,callback)=>{onAppState=callback;return{remove(){onAppState=undefined;}};}}},
    'react-native-webview':{WebView:'WebView'},'expo-crypto':{getRandomBytesAsync:async()=>new Uint8Array(32).fill(1)},
    '../../../stores/session-store':{getSession:async()=>({accessToken:'ANKT_MAIN_TOKEN',sessionId:'social-source',user:{id:'real-user'}}),
      subscribeSessionInvalidation:listener=>{sessionListeners.add(listener);return()=>sessionListeners.delete(listener);}},
  };
  const oldFetch=globalThis.fetch,oldApi=process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL='https://api.example';
  globalThis.fetch=async(path,options)=>{requests.push({path,options});
    if(path.includes('/config?'))return Response.json({clientId,launchUrl:url,origin});
    if(path.endsWith('/launch'))return Response.json({clientId,origin,environment:'Production',sessionId:'11111111-1111-4111-8111-111111111111',code:'c'.repeat(43),expiresIn:60});
    return new Response(null,{status:204});};
  const module=new Module(filename);module.filename=filename;module.require=name=>Object.hasOwn(overrides,name)?overrides[name]:localRequire(name);
  module._compile(ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
  const render=()=>{cursor=0;return module.exports.default({appId:clientId,attempt:1,onStatus:value=>statuses.push(value)});};
  render();refs[0].current={stopLoading(){stops++;},injectJavaScript:value=>injections.push(value)};
  const cleanup=effects[0]();
  return{render,requests,injections,statuses,background:()=>onAppState?.('background'),invalidate:()=>sessionListeners.forEach(listener=>listener()),stops:()=>stops,
    cleanup(){cleanup();globalThis.fetch=oldFetch;if(oldApi===undefined)delete process.env.EXPO_PUBLIC_API_URL;else process.env.EXPO_PUBLIC_API_URL=oldApi;}};
}
for(const platform of ['ios','android'])test(platform+' AuthHost mounts RN WebView, binds current URL, keeps ANKT JWT in host API and closes on background',async()=>{
  const f=fixture(platform);try{await flush();const web=f.render().props.children;
    assert.equal(web.type,'WebView');assert.equal(web.props.source.uri,url);assert.equal(web.props.sharedCookiesEnabled,false);
    assert.ok(!JSON.stringify(web.props).includes('ANKT_MAIN_TOKEN'));
    const message={channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.login',params:{clientId,codeChallenge:'p'.repeat(43)}};
    web.props.onMessage({nativeEvent:{url:'https://evil.example',data:envelope(message)}});await flush();assert.equal(f.requests.length,1);
    bindDocument(web,platform);
    web.props.onLoadStart({nativeEvent:{url}});web.props.onMessage({nativeEvent:{url:platform==='android'?origin:url,data:envelope(message)}});await flush();
    assert.equal(f.requests[1].options.headers.Authorization,'Bearer ANKT_MAIN_TOKEN');assert.equal(f.requests[1].options.headers['X-Ankt-Platform'],platform==='ios'?'iOS':'Android');
    assert.equal(f.injections.length,1);assert.ok(!f.injections[0].includes('ANKT_MAIN_TOKEN'));
    f.background();await flush();assert.equal(f.stops(),1);assert.ok(f.requests.some(request=>request.path.endsWith('/revoke')));
  }finally{f.cleanup();}
});
for(const platform of ['ios','android'])test(platform+' revokes a backgrounded session with the installed React Native abort polyfill',async()=>{
  const {AbortController:NativeAbortController,AbortSignal:NativeAbortSignal}=require('abort-controller/dist/abort-controller');
  const oldController=globalThis.AbortController,oldSignal=globalThis.AbortSignal;
  let f;
  try{
    globalThis.AbortController=NativeAbortController;globalThis.AbortSignal=NativeAbortSignal;
    assert.equal(typeof NativeAbortSignal.timeout,'undefined','exercise the actual RN API rather than Node AbortSignal');
    f=fixture(platform);await flush();const web=f.render().props.children;
    const sessionSignal=f.requests[0].options.signal;
    const message={channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.login',params:{clientId,codeChallenge:'p'.repeat(43)}};
    bindDocument(web,platform);
    web.props.onLoadStart({nativeEvent:{url}});
    web.props.onMessage({nativeEvent:{url:platform==='android'?origin:url,data:envelope(message)}});await flush();
    assert.equal(f.injections.length,1,'a session was created before closing the app');
    f.background();await flush();
    const revoke=f.requests.find(request=>request.path.endsWith('/revoke'));
    assert.ok(revoke,'closing must send revoke when native AbortSignal has no timeout API');
    assert.ok(revoke.options.signal instanceof NativeAbortSignal);
    assert.notEqual(revoke.options.signal,sessionSignal,'revocation must survive cancellation of the mounted host');
    assert.equal(sessionSignal.aborted,true);
    assert.equal(revoke.options.signal.aborted,false);
    assert.deepEqual(JSON.parse(revoke.options.body),{sessionId:'11111111-1111-4111-8111-111111111111'});
  }finally{
    f?.cleanup();globalThis.AbortController=oldController;globalThis.AbortSignal=oldSignal;
  }
});

test('iOS reload and redirects destroy the native auth channel before any further grant',async()=>{
  for(const redirect of [false,true]){const f=fixture();try{await flush();const web=f.render().props.children;
    web.props.onLoadStart({nativeEvent:{url}});web.props.onLoad({nativeEvent:{url}});
    if(redirect)assert.equal(web.props.onShouldStartLoadWithRequest({url:'https://evil.example'}),false);
    else web.props.onLoadStart({nativeEvent:{url}});
    assert.equal(f.stops(),1);assert.equal(f.render().props.children,null);
  }finally{f.cleanup();}}
});

test('Android history callbacks preserve a document until actual replacement is announced',async()=>{
  const f=fixture('android');try{await flush();const web=f.render().props.children;
    bindDocument(web,'android');
    web.props.onLoadStart({nativeEvent:{url}});
    web.props.onLoadStart({nativeEvent:{url}});
    assert.equal(f.stops(),0);
    assert.equal(f.render().props.children.type,'WebView');
    web.props.onLoad({nativeEvent:{url}});
    web.props.onLoadStart({nativeEvent:{url}});
    assert.equal(f.stops(),0,'a history callback after load does not prove document replacement');
    bindDocument(web,'android','33333333-3333-4333-8333-333333333333');
    assert.equal(f.stops(),1);
    assert.equal(f.render().props.children,null);
  }finally{f.cleanup();}
});

test('same-document Android history updates after load do not destroy the native channel',async()=>{
  const f=fixture('android');try{await flush();const web=f.render().props.children;
    web.props.onLoadStart({nativeEvent:{url,loading:true}});
    web.props.onLoad({nativeEvent:{url}});
    web.props.onLoadStart({nativeEvent:{url,loading:false}});
    assert.equal(f.stops(),0);
    assert.equal(f.render().props.children.type,'WebView');
    web.props.onLoadStart({nativeEvent:{url,loading:true}});
    assert.equal(f.stops(),0,'loading=true history notifications also preserve the same document');
  }finally{f.cleanup();}
});

test('Android same-document loading history after SDK connection keeps the session usable',async()=>{
  const f=fixture('android');try{await flush();const web=f.render().props.children;
    bindDocument(web,'android');
    web.props.onLoadStart({nativeEvent:{url}});
    const message={channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.login',params:{clientId,codeChallenge:'p'.repeat(43)}};
    web.props.onMessage({nativeEvent:{url:origin,data:envelope(message)}});await flush();
    assert.equal(f.requests.filter(request=>request.path.endsWith('/launch')).length,1);
    const ready={channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.ready',params:{clientId,sessionId:'11111111-1111-4111-8111-111111111111'}};
    web.props.onMessage({nativeEvent:{url:origin,data:envelope(ready)}});await flush();
    assert.equal(f.statuses.at(-1),'bridge.connected');
    web.props.onLoadStart({nativeEvent:{url,loading:true}});
    assert.equal(f.stops(),0);
    assert.equal(f.render().props.children.type,'WebView');
    assert.equal(f.requests.some(request=>request.path.endsWith('/revoke')),false);
    web.props.onMessage({nativeEvent:{url:origin,data:envelope(ready)}});await flush();
    assert.equal(f.statuses.at(-1),'bridge.connected');
  }finally{f.cleanup();}
});

test('Android document replacement at the same URL closes and revokes the previous SDK session',async()=>{
  const f=fixture('android');try{await flush();const web=f.render().props.children;
    bindDocument(web,'android');
    const message={channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.login',params:{clientId,codeChallenge:'p'.repeat(43)}};
    web.props.onMessage({nativeEvent:{url:origin,data:envelope(message)}});await flush();
    assert.equal(f.requests.filter(request=>request.path.endsWith('/launch')).length,1);
    bindDocument(web,'android','33333333-3333-4333-8333-333333333333');await flush();
    assert.equal(f.stops(),1);
    assert.equal(f.render().props.children,null);
    assert.ok(f.requests.some(request=>request.path.endsWith('/revoke')));
    web.props.onMessage({nativeEvent:{url:origin,data:envelope({...message,id:crypto.randomUUID()},'33333333-3333-4333-8333-333333333333')}});await flush();
    assert.equal(f.requests.filter(request=>request.path.endsWith('/launch')).length,1,'replacement cannot receive another grant');
  }finally{f.cleanup();}
});

test('Android Mini App tab routes keep the authenticated document running',async()=>{
  const f=fixture('android');try{await flush();const web=f.render().props.children;
    bindDocument(web,'android');
    web.props.onLoadStart({nativeEvent:{url}});web.props.onLoad({nativeEvent:{url}});
    const tab=origin+'/community?tab=latest#posts';
    web.props.onNavigationStateChange({url:tab});
    assert.equal(f.stops(),0,'a tab route within the configured origin must not destroy the host');
    assert.equal(web.props.onShouldStartLoadWithRequest({url:tab}),true);
    web.props.onLoadStart({nativeEvent:{url:tab,loading:true}});
    const message={channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.login',params:{clientId,codeChallenge:'p'.repeat(43)}};
    web.props.onMessage({nativeEvent:{url:tab,data:envelope(message)}});await flush();
    assert.equal(f.injections.length,1);
    assert.equal(f.render().props.children.type,'WebView');
    assert.equal(web.props.onShouldStartLoadWithRequest({url:'https://evil.example/community'}),false);
    await flush();assert.equal(f.stops(),1);
    assert.ok(f.requests.some(request=>request.path.endsWith('/revoke')));
  }finally{f.cleanup();}
});

test('social logout immediately removes native Mini App and stops further auth grants',async()=>{
  const f=fixture();try{await flush();const web=f.render().props.children;
    web.props.onLoadStart({nativeEvent:{url}});f.invalidate();await flush();
    assert.equal(f.stops(),1);assert.equal(f.render().props.children,null);
    const count=f.requests.filter(request=>request.path.endsWith('/launch')).length;
    web.props.onMessage({nativeEvent:{url,data:'{}'}});await flush();
    assert.equal(f.requests.filter(request=>request.path.endsWith('/launch')).length,count);
  }finally{f.cleanup();}
});
