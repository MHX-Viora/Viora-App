import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {accountRequest} from '../lib/account-client';
import {parseSsoConfiguration,ssoDraft,ssoRequest,ssoDiagnostic,type SsoConfiguration,type SsoDraft,type SsoEnvironment,type SsoScope} from '../lib/mini-app-sso';
import {Dialog} from './mini-apps';

export function MiniAppSso({appId,resetSignal,onDirty,onBusy,onSaved}:{appId:string;resetSignal:number;onDirty:(value:boolean)=>void;onBusy:(value:boolean)=>void;onSaved:(config:SsoConfiguration)=>void}){
  const [config,setConfig]=useState<SsoConfiguration|null>(null);const [draft,setDraft]=useState<SsoDraft|null>(null);const [environment,setEnvironment]=useState<SsoEnvironment>('Sandbox');
  const [pending,setPending]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [discard,setDiscard]=useState(false);
  const generation=useRef(0);const currentEnvironment=useRef<SsoEnvironment>('Sandbox');
  const dirty=!!(config&&draft&&JSON.stringify(draft)!==JSON.stringify(ssoDraft(config,environment)));
  const load=useCallback(async()=>{
    const current=++generation.current;setPending(true);setError('');setMessage('');
    try{const data=parseSsoConfiguration(await accountRequest<unknown>(`mini-apps/${appId}/sso`));if(current===generation.current){setConfig(data);setDraft(ssoDraft(data,currentEnvironment.current));}}
    catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'Không thể tải cấu hình SSO.');}
    finally{if(current===generation.current)setPending(false);}
  },[appId]);
  const invalidate=useCallback(()=>{generation.current++;},[]);
  useEffect(()=>{void load();return invalidate;},[load,invalidate]);
  useEffect(()=>{if(config)setDraft(ssoDraft(config,environment));},[resetSignal,config,environment]);
  useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
  useEffect(()=>{onBusy(pending);return()=>onBusy(false);},[pending,onBusy]);
  async function save(event:FormEvent){
    event.preventDefault();if(!config||!draft||pending)return;
    const current=++generation.current;setPending(true);setError('');setMessage('');
    try{const data=parseSsoConfiguration(await accountRequest<unknown>(`mini-apps/${appId}/sso/${environment}`,'PUT',ssoRequest(config,environment,draft)));
      if(current===generation.current){setConfig(data);setDraft(ssoDraft(data,environment));onSaved(data);setMessage('Đã lưu cấu hình. Trạng thái sẵn sàng bên dưới được kiểm tra lại từ máy chủ.');}}
    catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'Không thể lưu cấu hình.');}
    finally{if(current===generation.current)setPending(false);}
  }
  async function copy(value:string){try{await navigator.clipboard.writeText(value);setMessage('Đã sao chép.');}catch{setError('Không thể sao chép tự động. Bạn có thể chọn trường và sao chép thủ công.');}}
  const client=config?.clients.find(c=>c.environment===environment);
  const metadata=config?.server;
  const snippet=metadata?.issuer&&client?(client.clientType==='Public'?`const sdk = createMiniAppSdk(${JSON.stringify({issuer:metadata.issuer,clientId:client.clientId,redirectUri:client.redirectUris[0]??'',scope:client.scopes.join(' ')},null,2)});\nawait sdk.initialize();\nawait sdk.auth.login();`:`ANKT_ISSUER=${metadata.issuer}\nANKT_CLIENT_ID=${client.clientId}\nANKT_CLIENT_SECRET=<chỉ đặt trong môi trường backend>\n# Backend đổi code bằng PKCE và xác minh ID token; tạo cookie phiên riêng.`):null;
  return <section className="mini-section"><h2>Đăng nhập ANKT</h2><p className="muted">Authorization Code + PKCE S256. Người dùng ANKT tự cấp quyền; cấu hình của nhà phát triển không thay thế consent.</p>
    {error&&<p role="alert" className="form-error">{error}</p>}{message&&<p role="status">{message}</p>}{pending&&<p role="status">Đang xử lý cấu hình SSO…</p>}
    <button type="button" className="button button-secondary" disabled={pending} onClick={()=>dirty?setDiscard(true):void load()}>Tải lại cấu hình</button>
    {config&&draft&&<><form onSubmit={save}><fieldset disabled={pending}><legend>Cấu hình client</legend>
      <div className="mini-form-grid"><div className="form-field"><label htmlFor="sso-environment">Môi trường</label><select id="sso-environment" value={environment} onChange={e=>{
        if(dirty){setError('Lưu hoặc tải lại để bỏ thay đổi trước khi chuyển môi trường.');return;}
        const value=e.target.value as SsoEnvironment;currentEnvironment.current=value;setEnvironment(value);setDraft(ssoDraft(config,value));setError('');setMessage('');
      }}><option>Sandbox</option><option>Production</option></select></div>
      <div className="form-field"><label htmlFor="sso-client-type">Loại client</label><select id="sso-client-type" value={draft.clientType} onChange={e=>setDraft({...draft,clientType:e.target.value as SsoDraft['clientType']})}><option value="Public">Public — SPA / chỉ frontend</option><option value="Confidential">Confidential — có backend</option></select></div></div>
      <label><input type="checkbox" checked={draft.ssoEnabled} onChange={e=>setDraft({...draft,ssoEnabled:e.target.checked})}/> Bật cấu hình SSO cho ứng dụng (cả hai môi trường)</label>
      {environment==='Sandbox'?<p><label><input type="checkbox" checked={draft.sandboxEnabled} onChange={e=>setDraft({...draft,sandboxEnabled:e.target.checked})}/> Cho phép client thử nghiệm Sandbox</label></p>:<p className="notice">Production chỉ đăng nhập được khi ứng dụng đã Published. Lưu cấu hình không cấp quyền xuất bản.</p>}
      <fieldset><legend>Scope được phép yêu cầu — openid bắt buộc</legend>{(['openid','profile','email'] as SsoScope[]).map(scope=><label key={scope} className="mini-sso-scope"><input type="checkbox" checked={draft.scopes.includes(scope)} disabled={scope==='openid'&&draft.scopes.includes(scope)} onChange={e=>setDraft({...draft,scopes:e.target.checked?[...draft.scopes,scope]:draft.scopes.filter(s=>s!==scope)})}/>{scope}</label>)}</fieldset>
      <div className="form-field"><label htmlFor="sso-redirects">Callback HTTPS chính xác — mỗi dòng một URL</label><textarea id="sso-redirects" rows={4} required maxLength={20480} value={draft.redirects} onChange={e=>setDraft({...draft,redirects:e.target.value})}/></div>
      <p className="field-help">Public Client không có secret. Chuyển sang Public sẽ thu hồi secret cũ. Confidential Client chỉ đổi code và giữ secret trên backend; luồng cấp credential không đi qua tab này.</p>
      <button className="button" disabled={!dirty&&!!client}>{pending?'Đang lưu…':'Lưu cấu hình SSO'}</button>
    </fieldset></form>
    <h3>Chẩn đoán {environment}</h3><p role="status">{!metadata?.enabled?'Runtime SSO đang tắt. Có thể lưu cấu hình nhưng chưa thể đăng nhập.':!client?'Chưa có client trong môi trường này.':client.ready?'Cấu hình hiện đủ điều kiện SSO.':ssoDiagnostic(client.errorCode)}</p>
    {client?.errorCode&&<p className="field-help"><code>{client.errorCode}</code></p>}
    <dl className="mini-facts"><dt>Client ID</dt><dd>{client?.clientId??'Chưa tạo'}</dd><dt>Loại</dt><dd>{client?.clientType??draft.clientType}</dd><dt>Refresh token</dt><dd>{metadata?.refreshEnabled?'Theo chính sách máy chủ':'Không cấp'}</dd></dl>
    {[['Client ID',client?.clientId],['Issuer',metadata?.issuer],['Discovery',metadata?.discovery],['Authorization endpoint',metadata?.authorizationEndpoint],['Token endpoint',metadata?.tokenEndpoint],['UserInfo',metadata?.userInfoEndpoint],['JWKS',metadata?.jwksUri]].map(([label,value])=>value&&<div className="form-field" key={label}><label>{label}<input readOnly value={value} className="mini-credential"/></label><button type="button" className="button button-secondary" onClick={()=>void copy(value)}>Sao chép {label}</button></div>)}
    {snippet&&<><h3>{client?.clientType==='Public'?'Khởi tạo SDK Public Client':'Cấu hình backend đối tác'}</h3><p className="field-help">SDK hiện là gói cục bộ, chưa xuất bản npm.</p><pre className="mini-sso-code"><code>{snippet}</code></pre><button type="button" className="button button-secondary" onClick={()=>void copy(snippet)}>Sao chép ví dụ</button></>}
    <p className="muted">Phiên đối tác độc lập với phiên ANKT. SDK logout chỉ xóa phiên cục bộ; không thu hồi consent hoặc đăng xuất ANKT. Khi reload, Public Client thực hiện lại luồng điều hướng; không lưu token vào localStorage.</p>
    </>}
    {discard&&<Dialog title="Bỏ thay đổi cấu hình SSO?" close={()=>setDiscard(false)}><p>Tải lại sẽ thay thế các giá trị chưa lưu bằng cấu hình máy chủ.</p><button className="button button-secondary" onClick={()=>setDiscard(false)}>Tiếp tục chỉnh sửa</button><button className="button" onClick={()=>{setDiscard(false);void load();}}>Bỏ thay đổi và tải lại</button></Dialog>}
  </section>;
}
