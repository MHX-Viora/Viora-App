// Isolated UI fixture only, no backend, account or browser credentials.
const {buildSync}=require('esbuild');
const {createServer}=require('node:http');
const {resolve}=require('node:path');
const root=resolve(__dirname,'../../..');
const bundle=buildSync({absWorkingDir:root,entryPoints:['features/developer/tests/sandbox-ui.fixture.jsx'],bundle:true,write:false,outfile:'app.js',jsx:'automatic',define:{'process.env.NODE_ENV':JSON.stringify('development')}});
const assets=new Map(bundle.outputFiles.map(file=>[file.path.endsWith('.css')?'/app.css':'/app.js',file]));
createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');const asset=assets.get(req.url);
  if(asset){res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'text/javascript');res.end(asset.contents);return;}
  if(new URL(req.url,'http://localhost').pathname!=='/'){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang=vi><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><link rel=icon href="data:,"><title>Sandbox UI fixture</title><link rel=stylesheet href=/app.css><body style="margin:0"><div id=root></div><script src=/app.js></script></body></html>');
}).listen(5488,'127.0.0.1',()=>console.log('Sandbox UI sample fixture: http://127.0.0.1:5488'));
