import http from 'node:http';
import {readFile} from 'node:fs/promises';
const sdk=new URL('../public/sdk/',import.meta.url);
const server=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  let file,type,cache='no-cache';
  if(path==='/sdk/manifest.json'){file=new URL('manifest.json',sdk);type='application/json';}
  else if(/^\/sdk\/ankt-miniapp(?:\.v\d+\.\d+\.\d+\.min)?\.js$/.test(path)){
    file=new URL(path.slice(5),sdk);type='application/javascript';if(path.includes('.min.js'))cache='public, max-age=31536000, immutable';
  }else if(['/','/index.html','/app.js','/style.css','/ankt-miniapp.js'].includes(path)){
    const name=path==='/'?'index.html':path.slice(1);file=new URL(name,import.meta.url);
    type=name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html';
  }else{res.writeHead(404);res.end();return;}
  try{const bytes=await readFile(file);res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Content-Length':bytes.length,'Cache-Control':cache,'X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);}
  catch{res.writeHead(404);res.end();}
});
server.listen(8492,'127.0.0.1',()=>console.log('Mini App demo: http://127.0.0.1:8492'));
