/* global ANKTMiniApp */
let sdk;
const text=(id,value)=>{document.getElementById(id).textContent=value;};
document.getElementById('connect').addEventListener('submit',async event=>{
  event.preventDefault();sdk?.dispose();text('error','');text('status','Đang kết nối');
  text('environment','—');text('id','—');text('name','—');text('session','—');
  document.getElementById('avatar').hidden=true;document.getElementById('logout').disabled=true;
  try{
    sdk=ANKTMiniApp.create({clientId:document.getElementById('client').value.trim()});
    await sdk.init();const user=await sdk.auth.getUserInfo(),session=await sdk.auth.getSession();
    text('environment',sdk.app.getEnvironment());text('id',user.id);text('name',user.displayName);
    text('session',session.sessionId+' · '+new Date(session.expiresAt).toLocaleString('vi-VN'));
    if(user.avatarUrl&&new URL(user.avatarUrl).protocol==='https:'){const avatar=document.getElementById('avatar');avatar.src=user.avatarUrl;avatar.hidden=false;}
    text('status','Đã kết nối Bridge và đọc hồ sơ · chưa tạo phiên backend ứng dụng');document.getElementById('logout').disabled=false;
  }catch(error){text('status','Không kết nối');text('error',error.code??error.message);}
});
document.getElementById('logout').addEventListener('click',async()=>{
  try{await sdk?.auth.logout();text('status','Đã kết thúc phiên Mini App');document.getElementById('logout').disabled=true;}
  catch(error){text('error',error.code??error.message);}
});
window.addEventListener('pagehide',()=>sdk?.dispose());
