// Synthetic credentials only; never connects to the live credential endpoint.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {openDocsBrowser} from '../docs/tests/browser-fixture.mjs';

const clientId='app_'+'a'.repeat(43),otherId='app_'+'b'.repeat(43);
const directId='app_4gz57ReY-lzgqe5iAS8_btcuuaNnbYkFb2kWdqQNQCo';
const directSecret=environment=>'fixture-direct-'+environment+'-'+'d'.repeat(32);
const secret=environment=>environment==='Production'?'fixture-production-'+'p'.repeat(32):'fixture-sandbox-'+'s'.repeat(32);
const built=await build({stdin:{contents:`
  import {useState} from 'react';
  import {createRoot} from 'react-dom/client';
  import {MiniAppClientSecret} from './features/developer/components/mini-app-client-secret';
  function Fixture(){const [id,setId]=useState('${clientId}');return <><MiniAppClientSecret appId={id}/><button id="switch-app" onClick={()=>setId('${otherId}')}>Switch fixture app</button><button id="direct-app" onClick={()=>setId('${directId}')}>Direct fixture app</button></>;}
  createRoot(document.getElementById('root')).render(<Fixture/>);
`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"development"',
  'process.env.EXPO_PUBLIC_NTS_SANDBOX_CLIENT_SECRET':JSON.stringify(directSecret('Sandbox')),
  'process.env.EXPO_PUBLIC_NTS_PRODUCTION_CLIENT_SECRET':JSON.stringify(directSecret('Production'))}});
const requests=[];let hold=false,release,deny=false;
const server=createServer(async(req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(built.outputFiles[0].contents);}
  if(req.url.endsWith('/credentials/reveal')){
    let body='';for await(const chunk of req)body+=chunk;
    const {environment}=JSON.parse(body);requests.push({environment,method:req.method});
    if(hold&&environment==='Sandbox')await new Promise(resolve=>{release=resolve;});
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(deny){res.statusCode=403;return res.end(JSON.stringify({error:{message:'Không có quyền xem credential.'}}));}
    return res.end(JSON.stringify({clientId:req.url.includes(otherId)?otherId:clientId,environment,clientSecret:secret(environment)}));
  }
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="vi"><meta charset="utf-8"><link rel="icon" href="data:,"><div id="root"></div><script src="/app.js"></script></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
const value=`document.querySelector('[data-client-secret]').textContent`;
async function selectSandbox(){await browser.click('select');await browser.key('End');await browser.key('Enter');await browser.wait(`document.querySelector('select').value==='Sandbox'`);}
async function selectProduction(){await browser.click('select');await browser.key('Home');await browser.key('Enter');await browser.wait(`document.querySelector('select').value==='Production'`);}
try{
  browser=await openDocsBrowser();const origin='http://127.0.0.1:'+server.address().port;
  await browser.rpc('Page.navigate',{url:origin});await browser.wait(`!!document.querySelector('[data-client-secret]')`);
  await browser.wait(`${value}!==''`);assert.equal(await browser.read(value),secret('Production'));
  assert.equal(await browser.read(`document.querySelector('[data-client-secret]').tagName`),'CODE');
  assert.equal(await browser.read(`[...document.querySelectorAll('button')].some(button=>button.textContent==='Hiện Client Secret')`),false);
  assert.deepEqual(requests,[{environment:'Production',method:'POST'}]);
  await browser.rpc('Browser.grantPermissions',{origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
  await browser.click('.mini-client-secret button');
  await browser.wait(`document.querySelector('[role=status]')?.textContent.includes('Đã sao chép')`);
  assert.equal(await browser.read('navigator.clipboard.readText()'),secret('Production'));
  hold=true;await selectSandbox();assert.equal(await browser.read(value),'');
  await browser.wait(`document.querySelector('.mini-client-secret button').disabled`);
  await selectProduction();
  await browser.wait(`${value}===${JSON.stringify(secret('Production'))}`);
  assert.ok(release,'Sandbox request was held');release();hold=false;
  await browser.wait(`document.querySelector('select').value==='Production'`);
  assert.equal(await browser.read(value),secret('Production'),'late Sandbox response must not replace Production');
  deny=true;await browser.click('#switch-app');
  await browser.wait(`document.querySelector('[role=alert]')?.textContent.includes('Không có quyền')`);
  assert.equal(await browser.read(value),'');
  await browser.wait(`!!document.querySelector('.mini-client-secret > button')&&!document.querySelector('.mini-client-secret > button').disabled`);
  deny=false;await browser.click('.mini-client-secret > button');await browser.wait(`${value}!==''`);
  await browser.rpc('Runtime.evaluate',{expression:`window.dispatchEvent(new PageTransitionEvent('pagehide'))`});
  await browser.wait(`${value}===''`);assert.deepEqual(browser.issues,[]);
  const previousRequests=requests.length;deny=true;
  await browser.click('#direct-app');await browser.wait(`${value}===${JSON.stringify(directSecret('Production'))}`);
  await selectSandbox();assert.equal(await browser.read(value),directSecret('Sandbox'));
  assert.equal(requests.length,previousRequests,'directly configured app must never call the credential endpoint');
  await browser.click('.mini-client-secret button');
  await browser.wait(`document.querySelector('[role=status]')?.textContent.includes('Đã sao chép')`);
  assert.equal(await browser.read('navigator.clipboard.readText()'),directSecret('Sandbox'));
  await browser.click('#switch-app');await browser.wait(`document.querySelector('[role=alert]')?.textContent.includes('Không có quyền')`);
  assert.equal(await browser.read(value),'','direct app credentials must never appear for other apps');
  await browser.wait(`!document.querySelector('.mini-client-secret > button').disabled`);
  deny=false;await browser.click('.mini-client-secret > button');await browser.wait(`${value}===${JSON.stringify(secret('Sandbox'))}`);
  await browser.rpc('Emulation.setVirtualTimePolicy',{policy:'advance',budget:60001});
  assert.equal(await browser.read(value),secret('Sandbox'),'credential remains visible after 60 seconds');
  console.log('Secret UI passed: code/copy, direct FE values without API requests, cross-app isolation, owner API lifecycle, stale responses, no timed hiding, denied access, retry and pagehide. Synthetic credentials only.');
}finally{release?.();await browser?.close();await new Promise(resolve=>server.close(resolve));}
