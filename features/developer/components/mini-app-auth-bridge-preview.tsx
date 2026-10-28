import {useEffect,useRef,useState} from 'react';
import {accountRequest} from '../lib/account-client';
import {createAuthBridgeHost,type AuthLaunch} from '../../mini-apps/lib/auth-bridge-host';
import './mini-app-auth-bridge.css';
import Link from '../navigation.web';

type Config={clientId:string;launchUrl:string;origin:string;environment:string;scopes:string[]};
export function MiniAppAuthBridgePreview({appId}:{appId:string}){
  const localHostOrigin=typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname)?window.location.origin:null;
  const [config,setConfig]=useState<Config|null>(null),[status,setStatus]=useState('Disconnected'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{let active=true;setConfig(null);setError('');setStatus('Connecting');
    void accountRequest<Config>(`mini-apps/${appId}/auth-bridge`).then(value=>{
      const url=new URL(value.launchUrl);if(url.protocol!=='https:'||url.origin!==value.origin||value.clientId!==appId||value.environment!=='Sandbox')throw Error('INVALID_ORIGIN');
      if(active)setConfig(value);
    }).catch(reason=>{if(active){setStatus('Failed');setError(reason instanceof Error?reason.message:'HOST_UNAVAILABLE');}});
    return()=>{active=false;};
  },[appId,attempt]);
  useEffect(()=>{const element=frame.current;if(!config||!element)return;
    const current=config;let phase='Connecting',ended=false;
    const host=createAuthBridgeHost({clientId:appId,origin:current.origin,source:()=>element.contentWindow,
      send:data=>element.contentWindow?.postMessage(data,current.origin),
      launch:(codeChallenge)=>accountRequest<AuthLaunch>(`mini-apps/${appId}/auth-bridge/launch`,'POST',{clientId:appId,codeChallenge,origin:current.origin,scope:'profile'}),
      revoke:sessionId=>accountRequest<void>(`mini-apps/${appId}/auth-bridge/revoke`,'POST',{sessionId}),
      close:()=>{host.dispose();element.src='about:blank';phase='Disconnected';setStatus('Disconnected');},
      status:(value,errorCode)=>{if(!ended){
        const state=value==='Session Expired'?'Failed':value;phase=state;
        setStatus(state);
        setError(value==='Session Expired'?'SESSION_EXPIRED · Phiên đăng nhập đã hết hạn. Mở lại Sandbox.'
          :state==='Failed'?(errorCode??'AUTH_EXCHANGE_FAILED')+' · Không hoàn tất đăng nhập. Kiểm tra domain, phiên Developer và tài khoản Sandbox.':'');
      }}});
    const receive=(event:MessageEvent)=>{
      if(!ended&&event.source===element.contentWindow&&event.origin!==current.origin&&event.data?.channel==='ankt.auth'){
        phase='Failed';setStatus('Failed');setError('INVALID_ORIGIN · Website gửi yêu cầu từ '+event.origin+' nhưng ứng dụng đăng ký '+current.origin+'. Kiểm tra URL chuyển hướng của website.');return;
      }
      void host.handle(event);
    };window.addEventListener('message',receive);
    const timer=setTimeout(()=>{if(!ended&&(phase==='Connecting'||phase==='Authenticating')){
      const awaitingProfile=phase==='Authenticating';phase='Failed';setStatus('Failed');setError(awaitingProfile
      ?'AUTH_EXCHANGE_FAILED · Đã nhận yêu cầu đăng nhập nhưng chưa nhận xác nhận hồ sơ. Kiểm tra request auth-bridge/launch trên Portal và exchange, me trên website Mini App.'
      :localHostOrigin
      ?'HOST_UNAVAILABLE · Trên website Mini App, dùng SDK 0.4.0 trở lên với hostOrigin: '+localHostOrigin+'. Nếu vừa cập nhật SDK hoặc hostOrigin, bật Disable cache trong DevTools rồi tải lại Portal. Kiểm tra CSP frame-ancestors cho phép origin này và mở lại Sandbox.'
      :'HOST_UNAVAILABLE · Kiểm tra SDK và CSP frame-ancestors/X-Frame-Options cho phép nhúng từ '+location.origin);}},20000);
    // Preview must not reuse cached HTML after a partner publishes a new build.
    // This changes only the cache key; the verified origin and auth flow stay bound.
    const previewUrl=new URL(current.launchUrl);
    previewUrl.searchParams.set('__ankt_preview',crypto.randomUUID());
    element.src=previewUrl.href;
    return()=>{ended=true;clearTimeout(timer);window.removeEventListener('message',receive);host.dispose();element.src='about:blank';};
  },[appId,config,attempt,localHostOrigin]);
  return <section className="mini-section auth-bridge-preview" aria-label="Sandbox Auth Bridge"><h2>Sandbox · Auth Bridge</h2>
    <p>Mini App tự đăng nhập bằng tài khoản ANKT Sandbox. Không cần Client Secret hoặc callback đăng nhập.</p>
    {localHostOrigin&&<div className="notice"><strong>Chế độ phát triển ANKT nội bộ</strong><p>Hướng dẫn developer và mã sao chép vẫn dùng Host production https://mxh.ankt.vn. Riêng người đang phát triển ANKT tại địa chỉ này cần cấu hình thử nghiệm tạm thời với <code>hostOrigin: {JSON.stringify(localHostOrigin)}</code>. Đây không phải cấu hình production dành cho developer; xem docs/operations/miniapp-local-development.md trong repository ANKT. Backend vẫn chạy qua API HTTPS đã cấu hình; không đổi AllowedHostOrigin trên Render thành localhost.</p></div>}
    <p role="status" data-state={status}><strong>{{Disconnected:'Chưa kết nối',Connecting:'Đang kết nối',Authenticating:'Đang kết nối',Connected:'Đã kết nối',Failed:'Lỗi kết nối','Session Expired':'Lỗi kết nối'}[status] ?? status}</strong></p>{error&&<p role="alert" className="form-error">{error}</p>}
    <button className="button" onClick={()=>setAttempt(x=>x+1)}>Mở lại Sandbox</button>
    {status==='Connected'&&<p>Đã hoàn tất đăng nhập Sandbox. <Link href={'/console/apps/'+appId+'?tab=review'}>Tiếp tục gửi xét duyệt</Link>. Tạo bản nháp trước khi kiểm thử; nếu vừa tạo hoặc sửa bản nháp, hãy mở lại Sandbox để cập nhật bằng chứng.</p>}
    {config&&<iframe ref={frame} title="ANKT Sandbox Mini App" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms"
      allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'" style={{width:'100%',height:640,border:'1px solid #dbe5ef',marginTop:16,borderRadius:8}}/>}
  </section>;
}
