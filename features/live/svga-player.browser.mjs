import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { openDocsBrowser } from '../developer/docs/tests/browser-fixture.mjs';

// Use the shipped SVGA renderer. Only asset parsing is substituted, with a large
// portrait movie; this catches canvas sizing bugs hidden by a mocked player.
const library=await readFile('../viora-BE/viora-BE/wwwroot/gift-effects/svga.min.js');
const bundle=await build({
  stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{View,useWindowDimensions}from'react-native';import{SvgaPlayer}from'./features/live/svga-player.web';import{giftEffectFrame}from'./features/live/live-presentation';
  function Fixture(){const{width,height}=useWindowDimensions();return <View style={{height:'100vh',width:'100%',backgroundColor:'#15233a'}}><View testID="effect" style={{position:'absolute',...giftEffectFrame({width,height},width<900)}}><SvgaPlayer url="/fixture.svga" onFinished={()=>{}} style={{position:'absolute',inset:0}}/></View></View>};createRoot(document.getElementById('root')).render(<Fixture/>);`,resolveDir:process.cwd(),loader:'tsx'},
  bundle:true,write:false,jsx:'automatic',alias:{'react-native':'react-native-web'},define:{global:'globalThis','process.env.NODE_ENV':'"development"'},
  plugins:[{name:'local-source',setup(b){b.onResolve({filter:/^\.\/svga-source$/},()=>({path:'source',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const svgaPlayerScript=()=>'/svga.min.js';export const svgaSource=url=>url;`}));}}],
});
const server=createServer((req,res)=>{
  if(req.url==='/svga.min.js'){res.setHeader('Content-Type','text/javascript');res.end(library);return;}
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="root"></div><script src="/svga.min.js"></script><script>SVGA.Parser=class{load(url,done){done({videoSize:{width:750,height:1334},FPS:20,frames:600,images:{},sprites:[],audios:[]})}};</script><script src="/app.js"></script>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
  browser=await openDocsBrowser();await browser.rpc('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
  await browser.wait('!!document.querySelector("canvas")');
  for(const width of [320,375,768,1280]){
    await browser.rpc('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:false});
    await browser.wait(`Math.abs(document.querySelector('[data-testid="effect"]').getBoundingClientRect().width-${width<900?width:620})<1`);
    const r=await browser.read(`(()=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};return{frame:box(document.querySelector('[data-testid="effect"]')),canvas:box(document.querySelector('canvas'))}})()`);
    const scale=Math.min(r.frame.width/750,r.frame.height/1334);
    assert.ok(Math.abs(r.canvas.width-750*scale)<2,JSON.stringify(r));
    assert.ok(Math.abs(r.canvas.height-1334*scale)<2,JSON.stringify(r));
    assert.ok(Math.abs(r.canvas.x+r.canvas.width/2-(r.frame.x+r.frame.width/2))<2,JSON.stringify(r));
    assert.ok(Math.abs(r.canvas.y+r.canvas.height/2-(r.frame.y+r.frame.height/2))<2,JSON.stringify(r));
    assert.ok(Math.abs(r.frame.y+r.frame.height/2-400)<2,JSON.stringify(r));
    await writeFile('.codex-tmp/svga-centered-'+width+'.png',Buffer.from((await browser.rpc('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  assert.deepEqual(browser.issues.filter(e=>!e.includes('props.pointerEvents')),[]);
  console.log('PASS: shipped SVGA renderer keeps its real canvas centered and scaled at 320/375/768/1280px.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
