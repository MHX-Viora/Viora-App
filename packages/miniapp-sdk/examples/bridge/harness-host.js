import {BRIDGE_CHANNEL} from '/dist/bridge.js';
const frame=document.querySelector('#miniapp');const origin='https://localhost:5462';let verified=false;
const count=id=>{const el=document.getElementById(id);el.textContent=String(Number(el.textContent)+1);};
frame.addEventListener('load',()=>{verified=false;});
window.addEventListener('message',event=>{
  if(event.origin!==origin||event.source!==frame.contentWindow)return;
  const message=event.data;
  if(!message||typeof message!=='object'||Array.isArray(message)||Object.keys(message).sort().join(',')!=='channel,id,method,type,version'||
    message.channel!==BRIDGE_CHANNEL||message.version!==1||message.type!=='request'||typeof message.id!=='string'||!/^[a-f0-9-]{36}$/.test(message.id))return;
  let result;
  if(message.method==='bridge.handshake'){verified=true;count('handshakes');result={permissions:['platform.getContext','platform.close']};document.querySelector('#host-status').textContent='Đã xác minh handshake';}
  else if(verified&&message.method==='platform.getContext'){count('contexts');result={appId:'app_controlled_harness',environment:'Sandbox',runtime:'controlled-web'};}
  else if(verified&&message.method==='platform.close'){count('closed');result=null;}
  else{event.source.postMessage({channel:BRIDGE_CHANNEL,version:1,type:'response',id:message.id,ok:false},origin);return;}
  event.source.postMessage({channel:BRIDGE_CHANNEL,version:1,type:'response',id:message.id,ok:true,result},origin);
  if(message.method==='platform.close')requestAnimationFrame(()=>{verified=false;frame.hidden=true;document.querySelector('#host-status').textContent='Mini App đã đóng';});
});
