// Controlled UI fixture: no Developer credentials, real launch, or partner login.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {openDocsBrowser} from '../docs/tests/browser-fixture.mjs';

const clientId='app_'+'a'.repeat(43);
const output=await build({stdin:{contents:`
  import {createRoot} from 'react-dom/client';
  import {MiniAppBridgeIntegration} from './features/developer/components/mini-app-bridge-integration';
  createRoot(document.getElementById('root')).render(<MiniAppBridgeIntegration appId="${clientId}"/>);
`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'}});
const manifest=JSON.parse(await readFile('public/sdk/manifest.json','utf8'));
const sdk=await readFile('public'+manifest.url);
const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://fixture.invalid').pathname;
  if(pathname==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(output.outputFiles[0].contents);}
  if(pathname===manifest.url){res.setHeader('Content-Type','application/javascript');return res.end(sdk);}
  if(pathname==='/sdk/manifest.json'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(manifest));}
  if(pathname.startsWith('/developers/api/account/mini-apps/')){
    res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify(pathname.endsWith('/domain-verification')?{status:'Verified'}:{id:clientId,websiteUrl:'https://miniapp.example.com'}));
  }
  res.setHeader('Content-Type','text/html');
  res.end('<!doctype html><html lang="vi"><link rel="icon" href="data:,"><div id="root"></div><script src="/app.js"></script></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await openDocsBrowser();
  await browser.rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:1200,deviceScaleFactor:1,mobile:false});
  const origin='http://127.0.0.1:'+server.address().port;
  await browser.rpc('Page.navigate',{url:origin});
  await browser.wait(`document.querySelector('button[aria-label="Sao chép mã tích hợp production"]')?.disabled===false`);
  const code=await browser.read('document.querySelector("pre code").textContent');
  assert.ok(code.includes('https://mxh.ankt.vn'));
  assert.ok(!/localhost|127\.0\.0\.1/.test(code),'local Portal must not inject its origin into copied production code');
  assert.ok(code.includes('getLoginCode'));
  assert.ok(code.includes('/api/auth/ankt/exchange'));
  assert.ok(code.includes('?v='+manifest.version));
  await browser.rpc('Browser.grantPermissions',{origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
  await browser.click('button[aria-label="Sao chép mã tích hợp production"]');
  await browser.wait('document.querySelector("[role=status]")?.textContent.includes("Đã sao chép")');
  const copied=await browser.read('navigator.clipboard.readText()');
  assert.equal(copied.replaceAll('\r\n','\n'),code.replaceAll('\r\n','\n'));
  assert.deepEqual(browser.issues,[]);
  assert.deepEqual(browser.networkIssues,[]);
  console.log('Production integration UI: verified SDK download, production-only copy on local Portal, backend route and clipboard. Fixture data only.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
