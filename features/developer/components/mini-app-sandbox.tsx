import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '../navigation.web';
import type { MiniApp } from '../lib/mini-app-client';
import { sandboxClient, type SandboxSession } from '../lib/mini-app-sandbox';
import { createSandboxTransport, sandboxHostOrigin } from '../lib/sandbox-transport';
import './mini-app-sandbox.css';
import { SandboxResults } from './sandbox-results';
import { loadSandboxPage } from '../lib/sandbox-page';
import { MiniAppDirectTest } from './mini-app-direct-test';
import { accountRequest } from '../lib/account-client';
import { MiniAppAuthBridgePreview } from './mini-app-auth-bridge-preview';

const statuses: Record<string,string> = {
  starting:'Đang chờ Sandbox host xác nhận trình duyệt…', 'session.connected':'Đã mở website. Đang chờ bridge.',
  'bridge.connected':'Đã kết nối bridge · quan sát từ trình duyệt', 'bridge.disconnected':'Trang đã điều hướng. Đang chờ handshake mới.',
  'bridge.timeout':'Chưa nhận được handshake. Kiểm tra SDK, CSP frame-ancestors và khả năng nhúng iframe.',
  'launch.failed':'Không cấp được quyền khởi chạy. Dừng phiên rồi thử lại.',
  'host.close_failed':'Chưa xác nhận thu hồi phiên. Nhấn Dừng phiên để thử lại.',
  expired:'Phiên đã hết hạn.', stopped:'Đã dừng phiên Sandbox.',
};
const message = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối Sandbox. Vui lòng thử lại.';
export function MiniAppSandbox({appId}: {appId:string}) {
  const [app,setApp]=useState<MiniApp|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[advanced,setAdvanced]=useState(false);
  useEffect(()=>{
    let active=true;setApp(null);setError('');setAdvanced(false);
    void accountRequest<MiniApp>(`mini-apps/${appId}`).then(value=>{if(active)setApp(value);})
      .catch(reason=>{if(active)setError(message(reason));});
    return()=>{active=false;};
  },[appId,retry]);
  return <section className="mini-sandbox"><div className="mini-sandbox-heading"><div><p className="eyebrow">MINI APP SANDBOX</p><h1>Kiểm thử Mini App</h1></div><Link className="button button-secondary" href={'/console/apps/'+appId}>Về ứng dụng</Link></div>
    <p className="muted">Chạy thử với tài khoản ANKT Sandbox, kiểm tra đăng nhập và hồ sơ người dùng.</p>
    {error?<><p role="alert" className="form-error">{error}</p><button className="button" onClick={()=>setRetry(value=>value+1)}>Thử lại</button></>:!app?<p role="status">Đang tải ứng dụng…</p>:<>
      <MiniAppAuthBridgePreview key={appId} appId={appId}/>
      <div className="mini-sandbox-empty"><button className="button button-secondary" aria-expanded={advanced} onClick={()=>setAdvanced(value=>!value)}>Kiểm thử tự động nâng cao</button>
        {advanced&&<ManagedMiniAppSandbox key={appId} appId={appId}/>}</div>
    </>}
  </section>;
}
function ManagedMiniAppSandbox({appId}: {appId:string}) {
  const [app,setApp]=useState<MiniApp|null>(null),[host,setHost]=useState(''),[session,setSession]=useState<SandboxSession|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
  const [directTest,setDirectTest]=useState(false);
  const [status,setStatus]=useState('stopped'),[viewport,setViewport]=useState('mobile');
  const frame=useRef<HTMLIFrameElement>(null),startButton=useRef<HTMLButtonElement>(null),live=useRef<SandboxSession|null>(null),mounted=useRef(true),operation=useRef(false);
  const transport=useRef<ReturnType<typeof createSandboxTransport>|null>(null);
  const restoreFocus=useRef(false);
  useEffect(()=>{if(restoreFocus.current&&!session&&!busy&&startButton.current){restoreFocus.current=false;startButton.current.focus();}},[session,busy]);
  useEffect(()=>{
    mounted.current=true;
    return ()=>{mounted.current=false; transport.current?.dispose(); const current=live.current;live.current=null;
      if(current)void sandboxClient.revoke(appId,current.id).catch(()=>{/* Absolute expiry remains enforced by the server. */});};
  },[appId]);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');setApp(null);setHost('');setDirectTest(false);
    void loadSandboxPage(appId)
      .then(({app,config})=>{if(active){
        const host=config?sandboxHostOrigin(config.hostOrigin,location.origin):'';
        setApp(app);setHost(host);setDirectTest(config===null);
      }})
      .catch(e=>{if(active)setError(message(e));}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[appId,retry]);
  const stop=useCallback(async()=>{
    const current=live.current;if(!current||operation.current)return;
    operation.current=true;setBusy(true);setError('');transport.current?.dispose();
    // Remove execution immediately; retain metadata until server revocation is confirmed.
    if(frame.current)frame.current.src='about:blank';
    try{await sandboxClient.revoke(appId,current.id);live.current=null;if(mounted.current){restoreFocus.current=true;setSession(null);setStatus('stopped');}}
    catch(e){if(mounted.current){setError(message(e));setStatus('host.close_failed');}}
    finally{operation.current=false;if(mounted.current)setBusy(false);}
  },[appId]);
  useEffect(()=>{
    if(!session||!host||!frame.current)return;
    let active=true; const element=frame.current;
    const connection=createSandboxTransport({hostOrigin:host,portalOrigin:location.origin,sessionId:session.id,
      source:()=>element.contentWindow,launch:nonce=>sandboxClient.launch(appId,session.id,nonce),
      send:value=>element.contentWindow?.postMessage(value,host),status:type=>{
        if(!active)return;
        if(type==='host.closed'||type==='host.back'){live.current=null;restoreFocus.current=true;setSession(null);setStatus('stopped');}
        else setStatus(type);
      }});
    transport.current=connection;
    const receive=(event:MessageEvent)=>{void connection.handle(event);};window.addEventListener('message',receive);
    element.src=host+'/sandbox-host/'+session.id;
    const timeout=setTimeout(()=>{if(active)setStatus(previous=>previous==='starting'?'launch.failed':previous);},35000);
    const expires=setTimeout(()=>{if(active){connection.dispose();element.src='about:blank';setStatus('expired');void stop();}},Math.max(0,Date.parse(session.expiresAt)-Date.now()));
    const poll=setInterval(()=>{void sandboxClient.get(appId,session.id).then(value=>{
      if(active&&(value.revokedAt||Date.parse(value.expiresAt)<=Date.now())){connection.dispose();element.src='about:blank';live.current=null;restoreFocus.current=true;setSession(null);setStatus('expired');}
    }).catch(()=>{if(active){connection.dispose();element.src='about:blank';setError('Không xác nhận được quyền truy cập phiên. Dừng phiên rồi thử lại.');}});},30000);
    return ()=>{active=false;connection.dispose();window.removeEventListener('message',receive);clearTimeout(timeout);clearTimeout(expires);clearInterval(poll);};
  },[session,host,appId,stop]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(live.current){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[]);
  async function start(){
    if(operation.current||live.current)return;operation.current=true;setBusy(true);setError('');
    try{const value=await sandboxClient.create(appId);
      if(!mounted.current){await sandboxClient.revoke(appId,value.id);return;}
      if(value.environment!=='Sandbox'||value.appId!==appId){await sandboxClient.revoke(appId,value.id);throw new Error('Phản hồi phiên không hợp lệ.');}
      live.current=value;setStatus('starting');setSession(value);
    }catch(e){if(mounted.current)setError(message(e));}finally{operation.current=false;if(mounted.current)setBusy(false);}
  }
  if(loading)return <section className="mini-section" aria-busy="true"><h1>Sandbox</h1><p role="status">Đang kiểm tra ứng dụng và Sandbox host…</p></section>;
  return <section className="mini-sandbox"><div className="mini-sandbox-heading"><div><p className="eyebrow">MINI APP SANDBOX</p><h1>{app?.name??'Sandbox'}</h1></div>{!session&&<Link className="button button-secondary" href={'/console/apps/'+appId}>Về ứng dụng</Link>}</div>
    <p className="muted">{directTest?'Kiểm tra website và cấu hình đăng nhập ANKT của Mini App.':'Chạy website trong môi trường Sandbox. Kết nối bridge là quan sát từ trình duyệt; chưa phải kết quả kiểm thử hay quyền xuất bản.'}</p>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {directTest&&app?<MiniAppDirectTest key={appId} app={app}/>:!app||!host?<button className="button" onClick={()=>setRetry(v=>v+1)}>Thử lại</button>:<>
      <div className="mini-sandbox-toolbar" aria-label="Điều khiển Sandbox"><label>Kích thước<select value={viewport} onChange={e=>setViewport(e.target.value)}><option value="mobile">Điện thoại · 390 px</option><option value="tablet">Tablet · 768 px</option><option value="desktop">Toàn chiều rộng</option></select></label>
        {session?<><button className="button button-secondary" disabled={busy||status==='host.close_failed'} onClick={()=>{setStatus('starting');transport.current?.command('host.reload');}}>Tải lại website</button><button className="button" disabled={busy} onClick={()=>void stop()}>{busy?'Đang dừng…':'Dừng phiên'}</button></>:<button ref={startButton} className="button" disabled={busy} onClick={()=>void start()}>{busy?'Đang tạo phiên…':'Bắt đầu phiên Sandbox'}</button>}
      </div><p role="status" aria-live="polite">{statuses[status]??'Đang kết nối…'}</p>
      {session&&<><p className="muted">Hết hạn: {new Date(session.expiresAt).toLocaleString('vi-VN')}</p><div className={'mini-sandbox-preview mini-sandbox-'+viewport}><iframe ref={frame} title={'Sandbox · '+app.name} referrerPolicy="no-referrer" allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'" /></div></>}
      {!session&&<div className="mini-sandbox-empty"><h2>Sẵn sàng mở website thử nghiệm</h2><p>Phiên sử dụng URL đã đăng ký và domain đã xác minh. Nếu website chặn iframe hoặc trình duyệt chặn cookie, Sandbox sẽ hiển thị lỗi để bạn kiểm tra cấu hình.</p></div>}
    </>}
    {app&&host&&<SandboxResults key={appId} appId={appId} session={session}/>}
  </section>;
}
