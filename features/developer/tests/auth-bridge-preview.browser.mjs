// Synthetic browser regression: no real account, launch code, or backend.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {openDocsBrowser} from '../docs/tests/browser-fixture.mjs';

const bundle=await build({stdin:{contents:`
  import {createRoot} from 'react-dom/client';
  import {MiniAppAuthBridgePreview} from './features/developer/components/mini-app-auth-bridge-preview';
  const clientId='app_'+'a'.repeat(43),sessionId='11111111-1111-4111-8111-111111111111';
  const mode=new URLSearchParams(location.search).get('mode');
  const timers=new Map(),set=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);
  window.setTimeout=(fn,ms,...args)=>{if(ms!==20000)return set(fn,ms,...args);const id=set(()=>{},60000);timers.set(id,fn);return id;};
  window.clearTimeout=id=>{timers.delete(id);clear(id);};
  window.expirePreview=()=>{for(const fn of [...timers.values()])fn();};
  window.fetch=async(input)=>{
    if(String(input).endsWith('/launch')){
      if(mode==='failure')return Response.json({error:{code:'SANDBOX_NOT_ALLOWED',message:'Sandbox identity unavailable'}},{status:403});
      return Response.json({sessionId,clientId,origin:location.origin,environment:'Sandbox',code:'c'.repeat(43),expiresIn:60});
    }
    if(String(input).endsWith('/revoke'))return new Response(null,{status:204});
    return Response.json({clientId,launchUrl:location.origin+'/child?mode='+mode,origin:location.origin,environment:'Sandbox',scopes:['profile']});
  };
  createRoot(document.getElementById('root')).render(<MiniAppAuthBridgePreview appId={clientId}/>);
`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,outfile:'app.js',jsx:'automatic',
  define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'https-fixture',setup(b){
    // Config requires HTTPS. The fixture's same-origin child runs on loopback HTTP.
    b.onLoad({filter:/mini-app-auth-bridge-preview\.tsx$/},async args=>{
      const {readFile}=await import('node:fs/promises');
      return {contents:(await readFile(args.path,'utf8')).replace("url.protocol!=='https:'","url.protocol!=='http:'"),loader:'tsx'};
    });
  }}]});
const assets=new Map(bundle.outputFiles.map(file=>[file.path.endsWith('.css')?'/app.css':'/app.js',file.contents]));
const server=createServer((req,res)=>{
  res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':req.url==='/app.css'?'text/css':'text/html');
  if(assets.has(req.url))return res.end(assets.get(req.url));
  if(req.url.startsWith('/child?'))return res.end(`<!doctype html><script>
    const clientId='app_'+'a'.repeat(43);
    const mode=new URLSearchParams(location.search).get('mode');
    addEventListener('message',event=>{if(mode==='connected'&&event.data.ok)parent.postMessage({channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.ready',params:{clientId,sessionId:event.data.result.sessionId}},location.origin);});
    if(mode!=='idle')parent.postMessage({channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.login',params:{clientId,codeChallenge:'a'.repeat(43)}},location.origin);
  </script>`);
  res.end('<!doctype html><link rel="icon" href="data:,"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await openDocsBrowser();
  const origin='http://127.0.0.1:'+server.address().port;
  await browser.rpc('Page.navigate',{url:origin+'/?mode=failure'});
  await browser.wait("document.querySelector('[role=alert]')?.textContent.includes('Sandbox identity unavailable') || !!document.querySelector('[data-state=Failed]')");
  const before=await browser.read("document.querySelector('[role=alert]').textContent");
  await browser.read('window.expirePreview()');
  assert.equal(await browser.read("document.querySelector('[role=alert]').textContent"),before,'timeout must preserve the actual authentication failure');
  assert.match(before,/SANDBOX_NOT_ALLOWED/,'retain the backend error code');
  const firstLaunch=await browser.read("document.querySelector('iframe').src");
  const firstUrl=new URL(firstLaunch);
  assert.equal(firstUrl.searchParams.get('mode'),'failure','preserve registered launch parameters');
  assert.ok(firstUrl.searchParams.get('__ankt_preview'),'bypass previously cached preview HTML');
  await browser.rpc('Page.navigate',{url:origin+'/?mode=exchange'});
  await browser.wait("!!document.querySelector('[data-state=Authenticating]') || document.querySelector('[data-state=Connecting]') && document.querySelector('iframe')?.contentDocument?.readyState==='complete'");
  await browser.read('window.expirePreview()');
  assert.match(await browser.read("document.querySelector('[role=alert]').textContent"),/AUTH_EXCHANGE_FAILED/,'a received handshake must not be diagnosed as missing host');
  await browser.rpc('Page.navigate',{url:origin+'/?mode=connected'});
  await browser.wait("!!document.querySelector('[data-state=Connected]')");
  const connectedUrl=new URL(await browser.read("document.querySelector('iframe').src"));
  assert.equal(connectedUrl.origin,origin,'preserve the authorized launch origin');
  assert.notEqual(connectedUrl.searchParams.get('__ankt_preview'),firstUrl.searchParams.get('__ankt_preview'),'each preview opens fresh HTML');
  await browser.read('window.expirePreview()');
  assert.equal(await browser.read("document.querySelector('[role=status]').dataset.state"),'Connected');
  await browser.rpc('Page.navigate',{url:origin+'/?mode=idle'});
  await browser.wait("document.querySelector('iframe')?.contentDocument?.readyState==='complete'");
  await browser.read('window.expirePreview()');
  assert.match(await browser.read("document.querySelector('[role=alert]').textContent"),/HOST_UNAVAILABLE/);
  console.log('Sandbox preview regression passed: launch failure, exchange timeout, connected session, missing handshake. Synthetic data only.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}

