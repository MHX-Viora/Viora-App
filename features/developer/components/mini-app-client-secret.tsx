import {useEffect, useRef, useState} from 'react';
import {accountRequest} from '../lib/account-client';

type Environment = 'Production' | 'Sandbox';
type Credential = {clientId:string; environment:Environment; clientSecret:string; version:string; revoked:boolean};
type Operation = 'rotate' | 'revoke';
function validCredential(value:Credential, appId:string, environment:Environment) {
  return value.clientId===appId&&value.environment===environment&&typeof value.revoked==='boolean'
    &&typeof value.version==='string'&&/^[0-9a-f-]{36}$/i.test(value.version)
    &&typeof value.clientSecret==='string'&&(value.clientSecret===''||value.clientSecret.length>=32&&value.clientSecret.length<=256&&!/[\x00-\x1f\x7f]/.test(value.clientSecret))
    &&(!value.revoked||value.clientSecret==='');
}
export function MiniAppClientSecret({appId}:{appId:string}) {
  const [environment,setEnvironment]=useState<Environment>('Production');
  const [credential,setCredential]=useState<Credential|null>(null),[attempt,setAttempt]=useState(0);
  const [busy,setBusy]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [confirmation,setConfirmation]=useState<Operation|null>(null);
  const revision=useRef(0);
  const selected=credential?.clientId===appId&&credential.environment===environment?credential:null;
  const secret=selected?.clientSecret??'';

  useEffect(()=>{
    let active=true;
    const requestRevision=revision;
    const current=++requestRevision.current;
    setCredential(null);setBusy(true);setError('');setMessage('');setConfirmation(null);
    void accountRequest<Credential>(`mini-apps/${appId}/auth-bridge/credentials/reveal`,'POST',{environment}).then(value=>{
      if(!active||requestRevision.current!==current)return;
      if(!validCredential(value,appId,environment))throw Error('Client Secret trả về không hợp lệ.');
      setCredential(value);
    }).catch(reason=>{
      if(active&&requestRevision.current===current)setError(reason instanceof Error?reason.message:'Không tải được Client Secret.');
    }).finally(()=>{if(active&&requestRevision.current===current)setBusy(false);});
    const hide=()=>{active=false;requestRevision.current++;setCredential(null);setBusy(false);setError('');setMessage('');setConfirmation(null);};
    const restore=(event:PageTransitionEvent)=>{if(event.persisted)setAttempt(value=>value+1);};
    window.addEventListener('pagehide',hide);window.addEventListener('pageshow',restore);
    return()=>{active=false;requestRevision.current++;window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',restore);};
  },[appId,environment,attempt]);

  function selectEnvironment(value:Environment) {
    revision.current++;setEnvironment(value);setCredential(null);setBusy(true);setError('');setMessage('');setConfirmation(null);
  }
  async function copy() {
    if(!secret)return;
    const current=revision.current;
    try{await navigator.clipboard.writeText(secret);if(current===revision.current)setMessage('Đã sao chép Client Secret. Chỉ lưu ở backend đối tác.');}
    catch{if(current===revision.current)setError('Không thể sao chép tự động. Chọn giá trị trong ô rồi sao chép thủ công.');}
  }
  async function change(operation:Operation) {
    if(!selected||busy)return;
    const current=++revision.current;
    setBusy(true);setConfirmation(null);setError('');setMessage('');
    try {
      const value=await accountRequest<Credential>(`mini-apps/${appId}/auth-bridge/credentials/${operation}`,'POST',{environment,version:selected.version});
      if(current!==revision.current)return;
      if(!validCredential(value,appId,environment))throw Error('Credential trả về không hợp lệ.');
      setCredential(value);setMessage(operation==='revoke'?'Đã thu hồi Client Secret.':'Đã tạo secret mới. Cập nhật secret ở backend đối tác.');
    } catch(reason) {
      if(current===revision.current){setCredential(null);setError(reason instanceof Error?reason.message:'Không cập nhật được credential.');}
    } finally {if(current===revision.current)setBusy(false);}
  }

  return <div className="mini-client-secret">
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
      <select aria-label="Môi trường Client Secret" value={environment} disabled={busy&&!!selected} onChange={event=>selectEnvironment(event.target.value as Environment)}>
        <option value="Production">Production</option><option value="Sandbox">Sandbox</option>
      </select>
      <code data-client-secret aria-label={`Client Secret ${environment}`} aria-busy={busy}>{secret}</code>
      {!secret&&<span className="muted">{busy?'Đang tải Client Secret…':selected?.revoked?'Client Secret đã thu hồi':selected?'Tạo secret mới để lấy giá trị sử dụng.':'Client Secret chưa sẵn sàng'}</span>}
      <button type="button" className="button button-secondary" disabled={!secret||busy} onClick={()=>void copy()}>Copy Client Secret</button>
      <button type="button" className="button button-secondary" disabled={!selected||busy} onClick={()=>setConfirmation('rotate')}>Tạo secret mới</button>
      <button type="button" className="button button-secondary" disabled={!selected||selected.revoked||busy} onClick={()=>setConfirmation('revoke')}>Thu hồi secret</button>
    </div>
    <p className="muted">Secret riêng cho từng môi trường, tự cấp khi mở lần đầu. Chỉ lưu ở backend đối tác.</p>
    {confirmation&&<div role="alertdialog" aria-label="Xác nhận thay đổi Client Secret">
      <p>{confirmation==='rotate'?'Tạo secret mới sẽ vô hiệu secret hiện tại. Bạn cần cập nhật backend đối tác.':'Thu hồi sẽ ngừng xác thực backend đối tác bằng secret hiện tại.'}</p>
      <button type="button" className="button button-secondary" onClick={()=>void change(confirmation)}>Xác nhận</button>
      <button type="button" className="button button-secondary" onClick={()=>setConfirmation(null)}>Hủy</button>
    </div>}
    {message&&<p role="status" aria-live="polite">{message}</p>}
    {error&&<p role="alert" className="form-error">{error}</p>}
    {error&&!secret&&<button type="button" className="button button-secondary" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>Thử tải lại</button>}
  </div>;
}
