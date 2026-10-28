import {useEffect, useRef, useState} from 'react';
import {accountRequest} from '../lib/account-client';

type Environment = 'Production' | 'Sandbox';
type Credential = {clientId:string; environment:Environment; clientSecret:string};
const directlyConfiguredAppId='app_4gz57ReY-lzgqe5iAS8_btcuuaNnbYkFb2kWdqQNQCo';
// Explicit app-owner choice: these Expo build values are public in the FE bundle.
const directCredentials:Record<Environment,string>={
  Sandbox:process.env.EXPO_PUBLIC_NTS_SANDBOX_CLIENT_SECRET??'',
  Production:process.env.EXPO_PUBLIC_NTS_PRODUCTION_CLIENT_SECRET??'',
};

export function MiniAppClientSecret({appId}:{appId:string}) {
  const [environment,setEnvironment]=useState<Environment>('Production');
  const directlyConfigured=appId===directlyConfiguredAppId;
  const [credential,setCredential]=useState<Credential|null>(null),[attempt,setAttempt]=useState(0);
  const secret=directlyConfigured?directCredentials[environment]:credential?.clientId===appId&&credential.environment===environment?credential.clientSecret:'';
  const [busy,setBusy]=useState(!directlyConfigured),[error,setError]=useState(''),[message,setMessage]=useState('');
  const revision=useRef(0);

  useEffect(()=>{
    if(directlyConfigured){setCredential(null);setBusy(false);setError('');setMessage('');return;}
    let active=true;
    const requestRevision=revision;
    const current=++requestRevision.current;
    setCredential(null);setBusy(true);setError('');setMessage('');
    void accountRequest<Credential>(`mini-apps/${appId}/auth-bridge/credentials/reveal`,'POST',{environment}).then(value=>{
      if(!active||requestRevision.current!==current)return;
      if(value.clientId!==appId||value.environment!==environment||typeof value.clientSecret!=='string'||value.clientSecret.length<32||value.clientSecret.length>256||/[\x00-\x1f\x7f]/.test(value.clientSecret))throw Error('Client Secret trả về không hợp lệ.');
      setCredential(value);
    }).catch(reason=>{
      if(active&&requestRevision.current===current)setError(reason instanceof Error?reason.message:'Không tải được Client Secret.');
    }).finally(()=>{if(active&&requestRevision.current===current)setBusy(false);});
    const hide=()=>{active=false;requestRevision.current++;setCredential(null);setBusy(false);setError('');setMessage('');};
    const restore=(event:PageTransitionEvent)=>{if(event.persisted)setAttempt(value=>value+1);};
    window.addEventListener('pagehide',hide);
    window.addEventListener('pageshow',restore);
    return()=>{active=false;requestRevision.current++;window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',restore);};
  },[appId,environment,attempt,directlyConfigured]);

  function selectEnvironment(value:Environment) {
    revision.current++;setEnvironment(value);setCredential(null);setBusy(!directlyConfigured);setError('');setMessage('');
  }
  async function copy() {
    if(!secret)return;
    const current=revision.current;
    try{await navigator.clipboard.writeText(secret);if(current===revision.current)setMessage('Đã sao chép Client Secret. Chỉ lưu ở backend đối tác.');}
    catch{if(current===revision.current)setError('Không thể sao chép tự động. Chọn giá trị trong ô rồi sao chép thủ công.');}
  }

  return <div className="mini-client-secret">
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
      <select aria-label="Môi trường Client Secret" value={environment} onChange={event=>selectEnvironment(event.target.value as Environment)}>
        <option value="Production">Production</option><option value="Sandbox">Sandbox</option>
      </select>
      <code data-client-secret aria-label={`Client Secret ${environment}`} aria-busy={busy}>{secret}</code>
      {!secret&&<span className="muted">{busy?'Đang tải Client Secret…':'Client Secret chưa được cấu hình'}</span>}
      <button type="button" className="button button-secondary" disabled={!secret||busy} onClick={()=>void copy()}>Copy Client Secret</button>
    </div>
    <p className="muted">Client Secret theo môi trường đã chọn. Dùng để cấu hình backend đối tác.</p>
    {message&&<p role="status" aria-live="polite">{message}</p>}
    {error&&<p role="alert" className="form-error">{error}</p>}
    {directlyConfigured&&!secret&&<p role="alert" className="form-error">Chưa cấu hình Client Secret cho môi trường này trong bản build FE.</p>}
    {error&&!secret&&!directlyConfigured&&<button type="button" className="button button-secondary" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>Thử tải lại</button>}
  </div>;
}
