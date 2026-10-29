import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
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
 <div id="result"/><div id="sharing">{String(sharing)}</div>{mounted&&<HostAgoraPreview ref={ref} appId="fixture" cameraOn={camera} microphoneOn facing="front" style={{width:960,height:540}} onReady={()=>document.getElementById('result').textContent='ready'} onError={()=>{throw Error('camera error')}} onTokenWillExpire={()=>{}} onScreenShareChanged={setSharing}/>}</>};createRoot(document.getElementById('root')).render(<Fixture/>);`,resolveDir:process.cwd(),loader:'tsx'},
 bundle:true,write:false,jsx:'automatic',alias:{'react-native':'react-native-web'},define:{global:'globalThis','process.env.NODE_ENV':'"development"',__DEV__:'false'},
 plugins:[{name:'agora-fixture',setup(b){b.onResolve({filter:/^agora-rtc-sdk-ng$/},()=>({path:'agora',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:agora}));}}],
});
const server=createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(result.outputFiles[0].contents)}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<div id="root"></div><script src="/app.js"></script>')}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await openDocsBrowser();await browser.rpc('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
 await browser.wait('document.querySelector("#result")?.textContent==="ready"');
 await browser.click('#deny');await browser.click('#share');await browser.wait('document.querySelector("#result").textContent==="permission denied"');
 assert.equal(await browser.read('window.camera.media.readyState'),'live');assert.equal(await browser.read('document.querySelector("#sharing").textContent'),'false');
 await browser.click('#deny');await browser.click('#join');await browser.wait('window.calls.includes("publish:mic")');
 await browser.click('#share');await browser.wait('document.querySelector("#sharing").textContent==="true" && document.querySelector("video")?.readyState>=2');
 const pixels=`(()=>{const v=document.querySelector('video'),c=document.createElement('canvas');c.width=1280;c.height=720;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,1280,720);return [Array.from(x.getImageData(20,20,1,1).data),Array.from(x.getImageData(1100,520,1,1).data)]})()`;
 await browser.wait('document.querySelector("video").videoWidth===1280');
 let colors=await browser.read(pixels);assert.ok(colors[0][1]>240&&colors[0][0]<10,JSON.stringify(colors));assert.ok(colors[1][0]>240&&colors[1][1]<10,JSON.stringify(colors));
 assert.ok(await browser.read('window.calls.includes("unpublish:camera")&&window.calls.includes("publish:composed")'));
 await browser.click('#camera');await browser.wait(`(()=>{const v=document.querySelector('video'),c=document.createElement('canvas');c.width=1280;c.height=720;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0);return x.getImageData(1100,520,1,1).data[1]>240})()`);
 await browser.click('#end');await browser.wait('document.querySelector("#sharing").textContent==="false"');
 assert.equal(await browser.read('window.composed.media.readyState'), 'ended');assert.equal(await browser.read('window.screenTrack.media.readyState'),'ended');assert.equal(await browser.read('window.camera.media.readyState'),'live');
 assert.ok(await browser.read('window.calls.includes("unpublish:composed")&&window.calls.filter(c=>c==="publish:camera").length===2'));
 await browser.click('#share');await browser.wait('document.querySelector("#sharing").textContent==="true"');await browser.click('#unmount');await browser.wait('window.camera.media.readyState==="ended"&&window.composed.media.readyState==="ended"&&window.screenTrack.media.readyState==="ended"');
 assert.deepEqual(browser.issues.filter(e=>!e.includes('shadow*')&&!e.includes('props.pointerEvents')),[]);
 console.log('PASS: real browser screen/camera compositing pixels, published composed track, permission denial, camera toggle, OS stop restores camera, unmount releases tracks.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}

