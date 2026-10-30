import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { openDocsBrowser } from '../developer/docs/tests/browser-fixture.mjs';

const mocks = {
  'agora-rtc-sdk-ng': `
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=892;
    const draw=()=>{const x=canvas.getContext('2d');x.fillStyle='#00ff00';x.fillRect(0,0,1280,720);x.fillStyle='#0000ff';x.fillRect(0,0,80,720);x.fillStyle='#ffff00';x.fillRect(1200,0,80,720);x.fillStyle='#091725';x.fillRect(0,720,1280,172);x.fillStyle='#ff0000';x.fillRect(0,720,306,172)};draw();setInterval(draw,33);
    const media=canvas.captureStream(30).getVideoTracks()[0],listeners={};let player;
    const track={getMediaStreamTrack:()=>media,on:(n,f)=>listeners[n]=f,off:n=>delete listeners[n],stop:()=>{player?.pause();player?.remove()},play:(container,options)=>{window.viewerFit=options.fit;player=document.createElement('video');player.muted=true;player.autoplay=true;player.srcObject=new MediaStream([media]);container.replaceChildren(player);void player.play();setTimeout(()=>listeners['first-frame-decoded']?.(),100)}};
    export default{createClient:()=>({remoteUsers:[{uid:1,hasVideo:true,hasAudio:false,videoTrack:track}],connectionState:'CONNECTED',on(){},off(){},subscribe:async()=>{},setClientRole:async()=>{},join:async()=>9,renewToken:async()=>{},leave:async()=>{}})};`,
  '@/components/common/user-avatar': `import React from 'react';export const UserAvatar=()=>React.createElement('span',null,'Q');`,
  'expo-image': `import React from 'react';export const Image=()=>React.createElement('span',null,'🎁');`,
  './svga-player': `import React from 'react';import {View} from 'react-native';export const SvgaPlayer=({style})=>React.createElement(View,{style:[style,{backgroundColor:'rgba(255,0,150,.15)'}],testID:'svga-fixture'});`,
  './use-live-reduced-motion': `export const useLiveReducedMotion=()=>false;`,
  './premium-gift-effect-preference': `export const useReducedGiftEffects=()=>false;`,
};
const bundle = await build({
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{useWindowDimensions}from'react-native';
    import{AudienceAgoraView}from'./features/live/audience-agora-view.web';import{LiveGiftOverlay}from'./features/live/live-gift-overlay';import{createLiveGiftQueueManager}from'./features/live/live-gift-queue-manager';
    const manager=createLiveGiftQueueManager();manager.receive({id:'one',senderUserId:'s',senderName:'Quyên',giftId:'rocket',giftName:'Tên lửa',imageUrl:'fixture',animationUrl:'/fixture.svga',animationDurationMs:30000,quantity:1,totalAmount:1000});
    const access={appId:'fixture',channelName:'room',uid:9,token:'fixture',role:'audience'};
    function Fixture(){const{width}=useWindowDimensions();const[p,setP]=React.useState({version:1,width:1280,height:720,cameraOn:true,cameraX:.9,cameraY:.1});return <div style={{position:'relative',height:'100vh',width:'100%',background:'linear-gradient(#15233a,#27394c)',overflow:'hidden'}}>
      <button id="lower" style={{position:'absolute',zIndex:100}} onClick={()=>setP(v=>({...v,cameraY:v.cameraY<.5?.9:.1}))}>Đổi góc host</button>
      <button id="camera" style={{position:'absolute',left:120,zIndex:100}} onClick={()=>setP(v=>({...v,cameraOn:!v.cameraOn}))}>Camera</button>
      <AudienceAgoraView access={access} presentation={p} style={{position:'absolute',inset:0}} onError={()=>{throw Error('viewer failed')}} onTokenWillExpire={()=>{}}/>
      <LiveGiftOverlay manager={manager} compact={width<900}/></div>};createRoot(document.getElementById('root')).render(<Fixture/>);`, resolveDir:process.cwd(),loader:'tsx' },
  bundle:true,write:false,jsx:'automatic',alias:{'react-native':'react-native-web','react-native-svg':'react-native-svg/lib/module/elements.web.js','@':process.cwd()},
  define:{global:'globalThis','process.env.NODE_ENV':'"development"',__DEV__:'false'},
  plugins:[{name:'fixture',setup(b){b.onResolve({filter:/.*/},a=>Object.hasOwn(mocks,a.path)?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],resolveDir:process.cwd()}));}}],
});
const server=createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}*{box-sizing:border-box}</style><div id="root"></div><script src="/app.js"></script>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
const rects=`(()=>{const r=id=>{const x=document.querySelector('[data-testid="'+id+'"]').getBoundingClientRect();return{left:x.left,top:x.top,width:x.width,height:x.height}};return{screen:r('audience-screen'),camera:r('audience-camera'),gift:r('live-gift-effect-frame')}})()`;
try{
  browser=await openDocsBrowser();
  await browser.rpc('Emulation.setDeviceMetricsOverride',{width:375,height:800,deviceScaleFactor:1,mobile:false});
  await browser.rpc('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
  await browser.wait('document.querySelector("[data-testid=audience-camera] video")?.readyState>=2&&!!document.querySelector("[data-testid=live-gift-effect-frame]")');
  let r=await browser.read(rects);
  assert.equal(r.screen.width,375);assert.ok(r.camera.top+r.camera.height<=r.screen.top);
  assert.equal(r.gift.width,375);assert.equal(r.gift.left,0);assert.ok(r.gift.top+r.gift.height<=704);
  const screenshot=await browser.rpc('Page.captureScreenshot',{format:'png'});
  await writeFile('.codex-tmp/live-viewer-responsive-375-upper.png',Buffer.from(screenshot.data,'base64'));
  const colors=await browser.read(`(async()=>{const image=new Image();image.src='data:image/png;base64,${screenshot.data}';await image.decode();const c=document.createElement('canvas');c.width=375;c.height=800;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0);return [Array.from(x.getImageData(3,${r.screen.top+r.screen.height/2},1,1).data),Array.from(x.getImageData(371,${r.screen.top+r.screen.height/2},1,1).data)]})()`);
  assert.ok(colors[0][2]>200&&colors[0][0]<80,JSON.stringify(colors));assert.ok(colors[1][0]>200&&colors[1][1]>200,JSON.stringify(colors));
  await browser.click('#lower');await browser.wait(`(()=>{const s=document.querySelector('[data-testid="audience-screen"]').getBoundingClientRect(),c=document.querySelector('[data-testid="audience-camera"]').getBoundingClientRect();return c.top>=s.bottom})()`);
  await writeFile('.codex-tmp/live-viewer-responsive-375-lower.png',Buffer.from((await browser.rpc('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await browser.click('#camera');await browser.wait('!document.querySelector("[data-testid=audience-camera]")');await browser.click('#camera');
  for(const width of [320,430,768,1600]){
    await browser.rpc('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await browser.wait(`Math.abs(document.querySelector('[data-testid="audience-screen"]').getBoundingClientRect().width-${Math.min(width,1100)})<1`);
    r=await browser.read(rects);assert.ok(r.screen.left>=0&&r.screen.left+r.screen.width<=width);
    assert.ok(r.camera.left>=0&&r.camera.left+r.camera.width<=width);
    if(width>=900){assert.equal(r.gift.width,620);assert.equal(r.gift.left,(width-620)/2);}
  }
  await writeFile('.codex-tmp/live-viewer-responsive-1600.png',Buffer.from((await browser.rpc('Page.captureScreenshot',{format:'png'})).data,'base64'));
  assert.equal(await browser.read('window.viewerFit'),'contain');
  assert.deepEqual(browser.issues.filter(e=>!e.includes('shadow*')&&!e.includes('props.pointerEvents')),[]);
  console.log('PASS: real viewer crops preserve both screen edges, phone camera upper/lower bands, camera off/on, 320–1600px sizing, centered lower gift effects and contained fallback.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
