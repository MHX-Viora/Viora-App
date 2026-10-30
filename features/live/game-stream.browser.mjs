import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { openDocsBrowser } from '../developer/docs/tests/browser-fixture.mjs';

// Real browser MediaStream/canvas pipeline. Only camera acquisition and Agora transport are fixtures.
const agora = `
const noop=()=>{}; window.calls=[];
function track(name,width,height,color){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const paint=()=>{const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,width,height)};paint();
 const timer=setInterval(paint,33),media=canvas.captureStream(30).getVideoTracks()[0];
 return local(name,media,()=>clearInterval(timer));
}
function local(name,media,cleanup=noop){let player;const listeners={};return {name,media,
 getMediaStreamTrack:()=>media,setMuted:async()=>{},setDevice:async()=>{},
 play(element){player=document.createElement('video');player.muted=true;player.autoplay=true;player.srcObject=new MediaStream([media]);element.replaceChildren(player);void player.play()},
 stop(){player?.remove()},close(){media.stop();cleanup();window.calls.push('close:'+name)},
 on(event,fn){listeners[event]=fn},off(event){delete listeners[event]},end(){listeners['track-ended']?.()}};
}
export default {
 createClient:()=>({on:noop,removeAllListeners:noop,setClientRole:async()=>{},join:async()=>1,renewToken:async()=>{},leave:async()=>{window.calls.push('leave')},
 publish:async tracks=>{for(const t of [].concat(tracks))window.calls.push('publish:'+t.name)},unpublish:async t=>window.calls.push('unpublish:'+t.name)}),
 createCameraVideoTrack:async()=>window.camera=track('camera',360,640,'#ff0000'),
 createMicrophoneAudioTrack:async()=>({name:'mic',setMuted:async()=>{},close:noop}),getCameras:async()=>[],
 createScreenVideoTrack:async()=>{if(window.fixtureDeny)throw Error('permission denied');return window.screenTrack=track('screen',1280,720,'#00ff00')},
 createCustomVideoTrack:({mediaStreamTrack})=>window.composed=local('composed',mediaStreamTrack)
};`;
const result=await build({
 stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{HostAgoraPreview}from'./features/live/host-agora-preview.web';
 function Fixture(){const ref=React.useRef(null),[camera,setCamera]=React.useState(true),[sharing,setSharing]=React.useState(false),[mounted,setMounted]=React.useState(true);const run=fn=>void fn().then(()=>document.getElementById('result').textContent='ok').catch(e=>document.getElementById('result').textContent=e.message);return <>
 <button id="share" onClick={()=>run(()=>ref.current.shareScreen())}>Share</button><button id="stop" onClick={()=>run(()=>ref.current.stopScreenShare())}>Stop</button>
 <button id="join" onClick={()=>run(()=>ref.current.join({appId:'fixture',role:'broadcaster',channelName:'test',uid:1,token:'fixture'}))}>Join</button>
 <button id="camera" onClick={()=>setCamera(v=>!v)}>Camera</button><button id="end" onClick={()=>window.screenTrack.end()}>OS Stop</button><button id="deny" onClick={()=>window.fixtureDeny=!window.fixtureDeny}>Deny</button><button id="unmount" onClick={()=>setMounted(false)}>Close</button>
 <div id="result"/><div id="sharing">{String(sharing)}</div>{mounted&&<HostAgoraPreview ref={ref} appId="fixture" cameraOn={camera} microphoneOn facing="front" style={{width:'100%',maxWidth:960,height:540}} onReady={()=>document.getElementById('result').textContent='ready'} onError={()=>{throw Error('camera error')}} onTokenWillExpire={()=>{}} onScreenShareChanged={setSharing}/>}</>};createRoot(document.getElementById('root')).render(<Fixture/>);`,resolveDir:process.cwd(),loader:'tsx'},
 bundle:true,write:false,jsx:'automatic',alias:{'react-native':'react-native-web'},define:{global:'globalThis','process.env.NODE_ENV':'"development"',__DEV__:'false'},
 plugins:[{name:'agora-fixture',setup(b){b.onResolve({filter:/^agora-rtc-sdk-ng$/},()=>({path:'agora',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:agora}));}}],
});
const server=createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(result.outputFiles[0].contents)}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<div id="root"></div><script src="/app.js"></script>')}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await openDocsBrowser();await browser.rpc('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.rpc('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
 await browser.wait('document.querySelector("#result")?.textContent==="ready"');
 await browser.click('#deny');await browser.click('#share');await browser.wait('document.querySelector("#result").textContent==="permission denied"');
 assert.equal(await browser.read('window.camera.media.readyState'),'live');assert.equal(await browser.read('document.querySelector("#sharing").textContent'),'false');
 await browser.click('#deny');await browser.click('#join');await browser.wait('window.calls.includes("publish:mic")');
 await browser.click('#share');await browser.wait('document.querySelector("#sharing").textContent==="true" && document.querySelector("video")?.readyState>=2');
 await browser.read(`(async()=>{window.output=document.createElement('video');window.output.muted=true;window.output.srcObject=new MediaStream([window.composed.media]);await window.output.play()})()`);
 const pixels=`(()=>{const v=window.output,c=document.createElement('canvas');c.width=1280;c.height=892;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0);return [Array.from(x.getImageData(20,20,1,1).data),Array.from(x.getImageData(100,800,1,1).data)]})()`;
 await browser.wait('window.output.videoWidth===1280&&window.output.videoHeight===892');
 let colors=await browser.read(pixels);assert.ok(colors[0][1]>240&&colors[0][0]<10,JSON.stringify(colors));assert.ok(colors[1][0]>240&&colors[1][1]<10,JSON.stringify(colors));
 assert.ok(await browser.read('window.calls.includes("unpublish:camera")&&window.calls.includes("publish:composed")'));
 // The host inset moves while screen/camera remain separate in the published frame.
 const drag=await browser.read(`(()=>{const r=document.querySelector('[data-testid="game-camera-drag"]').getBoundingClientRect(),v=document.querySelector('video').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,toX:v.left+r.width/2,toY:v.top+r.height/2}})()`);
 await browser.rpc('Input.dispatchMouseEvent',{type:'mousePressed',x:drag.x,y:drag.y,button:'left',clickCount:1});
 await browser.rpc('Input.dispatchMouseEvent',{type:'mouseMoved',x:drag.x-4,y:drag.y-4,button:'left',buttons:1});
 for(let step=1;step<=12;step++){
  await browser.rpc('Input.dispatchMouseEvent',{type:'mouseMoved',x:drag.x+(drag.toX-drag.x)*step/12,y:drag.y+(drag.toY-drag.y)*step/12,button:'left',buttons:1});
  if(step===6)await browser.wait(`(()=>{const r=document.querySelector('[data-testid="game-camera-drag"]').getBoundingClientRect();return Math.abs(r.left+r.width/2-${(drag.x+drag.toX)/2})<10})()`);
 }
 await browser.rpc('Input.dispatchMouseEvent',{type:'mouseReleased',x:drag.toX,y:drag.toY,button:'left',clickCount:1});
 const redAt=(x,y)=>`(()=>{const v=window.output,c=document.createElement('canvas');c.width=1280;c.height=892;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0);return ctx.getImageData(${x},${y},1,1).data[0]>240})()`;
 await browser.wait(`document.querySelector('[data-testid="game-camera-drag"]').getBoundingClientRect().left<60`);
 assert.equal(await browser.read(redAt(1100,520)),false);
 // The accessible button cycles corners without dragging.
 await browser.click('[aria-label="Đổi góc camera"]');await browser.wait(`document.querySelector('[data-testid="game-camera-drag"]').getBoundingClientRect().left>500`);
 assert.equal(await browser.read('document.activeElement?.getAttribute("aria-label")'),'Đổi góc camera');
 await browser.key('Enter');
 await browser.wait(`document.querySelector('[data-testid="game-camera-drag"]').getBoundingClientRect().top>350`);
 await browser.rpc('Emulation.setDeviceMetricsOverride',{width:375,height:720,deviceScaleFactor:1,mobile:false});
 await browser.rpc('Emulation.setTouchEmulationEnabled',{enabled:true});
 await browser.wait(`document.querySelector('[data-testid="game-camera-drag"]').getBoundingClientRect().right<=375`);
 const touch=await browser.read(`(()=>{const r=document.querySelector('[data-testid="game-camera-drag"]').getBoundingClientRect(),v=document.querySelector('video').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,toX:v.left+r.width/2,toY:v.top+r.height/2}})()`);
 await browser.rpc('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y,id:1}]});
 await browser.rpc('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x-4,y:touch.y-4,id:1}]});
 for(let step=1;step<=12;step++)await browser.rpc('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x+(touch.toX-touch.x)*step/12,y:touch.y+(touch.toY-touch.y)*step/12,id:1}]});
 await browser.rpc('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await browser.wait(redAt(100,800));
 assert.ok(await browser.read(`document.querySelector('[data-testid="game-camera-drag"]').getBoundingClientRect().left<100`));
 await writeFile('.codex-tmp/game-camera-drag-375.png',Buffer.from((await browser.rpc('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await browser.rpc('Emulation.setTouchEmulationEnabled',{enabled:false});
 await browser.rpc('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await writeFile('.codex-tmp/game-camera-drag-1280.png',Buffer.from((await browser.rpc('Page.captureScreenshot',{format:'png'})).data,'base64'));
 assert.equal(await browser.read('window.calls.filter(c=>c==="publish:composed").length'),1);
 await browser.click('#camera');await browser.wait(`!(${redAt(100,800)})`);
 await browser.click('#camera');await browser.wait(redAt(100,800));
 await browser.click('#end');await browser.wait('document.querySelector("#sharing").textContent==="false"');
 assert.equal(await browser.read('window.composed.media.readyState'), 'ended');assert.equal(await browser.read('window.screenTrack.media.readyState'),'ended');assert.equal(await browser.read('window.camera.media.readyState'),'live');
 assert.ok(await browser.read('window.calls.includes("unpublish:composed")&&window.calls.filter(c=>c==="publish:camera").length===2'));
 await browser.click('#share');await browser.wait('document.querySelector("#sharing").textContent==="true"');await browser.click('#unmount');await browser.wait('window.camera.media.readyState==="ended"&&window.composed.media.readyState==="ended"&&window.screenTrack.media.readyState==="ended"');
 assert.deepEqual(browser.issues.filter(e=>!e.includes('shadow*')&&!e.includes('props.pointerEvents')),[]);
 console.log('PASS: screen/camera pixels, draggable broadcast inset, accessible corner cycling, one composed publication, denial, camera toggle, OS stop and cleanup.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}

