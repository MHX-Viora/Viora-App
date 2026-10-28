import {connectHostBridge} from '/dist/bridge.js';
const status=document.querySelector('#child-status');
window.addEventListener('load',async()=>{
try{
  const bridge=await connectHostBridge('https://localhost:5461');
  status.textContent=bridge.insideHost?'Host đã được xác minh':'Chưa xác minh host';
  const context=document.querySelector('#context-button');const close=document.querySelector('#close-button');context.disabled=false;close.disabled=false;
  context.addEventListener('click',async()=>{try{const value=await bridge.getContext();document.querySelector('#context').textContent=`${value.appId} · ${value.environment} · ${value.runtime}`;}catch(error){status.textContent=error.code;}});
  close.addEventListener('click',async()=>{try{await bridge.close();status.textContent='Đã yêu cầu đóng';bridge.dispose();}catch(error){status.textContent=error.code;}});
}catch(error){status.textContent=error.code;}
},{once:true});
