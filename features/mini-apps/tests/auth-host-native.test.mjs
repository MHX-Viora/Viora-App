import test from 'node:test';
import assert from 'node:assert/strict';
import Module,{createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript');
const clientId='app_'+'a'.repeat(43),url='https://mini.example/start',origin='https://mini.example';
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
    const envelope=JSON.stringify({nonce:Buffer.alloc(32,1).toString('base64url'),data:JSON.stringify(message)});
    web.props.onMessage({nativeEvent:{url:'https://evil.example',data:envelope}});await flush();assert.equal(f.requests.length,1);
    web.props.onLoadStart({nativeEvent:{url}});web.props.onMessage({nativeEvent:{url,data:envelope}});await flush();
    assert.equal(f.requests[1].options.headers.Authorization,'Bearer ANKT_MAIN_TOKEN');assert.equal(f.requests[1].options.headers['X-Ankt-Platform'],platform==='ios'?'iOS':'Android');
    assert.equal(f.injections.length,1);assert.ok(!f.injections[0].includes('ANKT_MAIN_TOKEN'));
    f.background();await flush();assert.equal(f.stops(),1);assert.ok(f.requests.some(request=>request.path.endsWith('/revoke')));
  }finally{f.cleanup();}
});
test('reload and redirects destroy the native auth channel before any further grant',async()=>{
  for(const redirect of [false,true]){const f=fixture();try{await flush();const web=f.render().props.children;
    web.props.onLoadStart({nativeEvent:{url}});
    if(redirect)assert.equal(web.props.onShouldStartLoadWithRequest({url:'https://evil.example'}),false);
    else web.props.onLoadStart({nativeEvent:{url}});
    assert.equal(f.stops(),1);assert.equal(f.render().props.children,null);
  }finally{f.cleanup();}}
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
