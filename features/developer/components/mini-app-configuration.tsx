import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { accountRequest } from '../lib/account-client';
import { downloadVerificationFile, type ConfigurationReadiness, type DomainVerification, type IntegrationConfiguration } from '../lib/mini-app-integration';
import { Dialog } from './mini-apps';

const labels: Record<string,string> = { logo:'Logo',name:'Tên ứng dụng',category:'Danh mục',description:'Mô tả',website:'Website',domain:'Xác minh domain',supportEmail:'Email hỗ trợ',callbacks:'Callback SSO',privacyPolicy:'Privacy Policy',termsOfService:'Terms of Service',sandboxRuntime:'Sandbox runtime',adminReview:'Kiểm duyệt' };
const statuses = { Pending:'Chưa xác minh',Verified:'Đã xác minh',Failed:'Xác minh thất bại',Expired:'File đã hết hạn',Revoked:'Đã thu hồi' };
const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Yêu cầu thất bại. Vui lòng thử lại.';
const timestamp = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có';

export function MiniAppConfiguration({ appId, active, resetSignal, onDirty, onBusy, onSaved }: {
  appId: string; active: boolean; resetSignal: number; onDirty: (value: boolean) => void; onBusy: (value: boolean) => void; onSaved: (configuration: IntegrationConfiguration) => void;
}) {
  const [draft,setDraft] = useState<IntegrationConfiguration | null>(null); const [saved,setSaved] = useState<IntegrationConfiguration | null>(null);
  const [domain,setDomain] = useState<DomainVerification | null>(null); const [readiness,setReadiness] = useState<ConfigurationReadiness | null>(null);
  const [loading,setLoading] = useState(true); const [checking,setChecking] = useState(false); const [pending,setPending] = useState('');
  const [error,setError] = useState(''); const [statusError,setStatusError] = useState(''); const [message,setMessage] = useState('');
  const [retry,setRetry] = useState(0); const [confirm,setConfirm] = useState(false);
  const baseline = useRef<IntegrationConfiguration | null>(null); const alive = useRef(true); const busy = useRef(false); const statusGeneration = useRef(0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => { onDirty(dirty); },[dirty,onDirty]);
  useEffect(() => { onBusy(!!pending); },[pending,onBusy]);
  useEffect(() => { setDraft(baseline.current); setError(''); },[resetSignal]);
  useEffect(() => {
    alive.current = true; const invalidate = () => { statusGeneration.current++; };
    return () => { alive.current = false; invalidate(); };
  },[]);
  const refreshStatus = useCallback(async () => {
    const generation = ++statusGeneration.current; setChecking(true); setStatusError(''); setDomain(null); setReadiness(null);
    try {
      const verification = await accountRequest<DomainVerification>(`mini-apps/${appId}/domain-verification`);
      if (alive.current && generation === statusGeneration.current) setDomain(verification);
      const checks = await accountRequest<ConfigurationReadiness>(`mini-apps/${appId}/readiness`);
      if (alive.current && generation === statusGeneration.current) setReadiness(checks);
    } catch (e) { if (alive.current && generation === statusGeneration.current) { setStatusError(errorMessage(e)); setReadiness(null); } }
    finally { if (alive.current && generation === statusGeneration.current) setChecking(false); }
  },[appId]);
  useEffect(() => {
    let mounted = true; setLoading(true); setError('');
    accountRequest<IntegrationConfiguration>(`mini-apps/${appId}/integration`).then(data => {
      if (mounted) { setSaved(data); setDraft(data); baseline.current = data; void refreshStatus(); }
    }).catch(e => { if(mounted) setError(errorMessage(e)); }).finally(() => { if(mounted) setLoading(false); });
    return () => { mounted = false; };
  },[appId,retry,refreshStatus]);
  async function action(name: string, work: () => Promise<void>) {
    if (busy.current) return; busy.current = true; setPending(name); setError(''); setMessage('');
    try { await work(); } catch(e) { if(alive.current) setError(errorMessage(e)); }
    finally { busy.current = false; if(alive.current) setPending(''); }
  }
  function field(key: keyof IntegrationConfiguration, value: string | boolean | string[]) {
    setDraft(previous => previous ? {...previous,[key]:value} : previous); setMessage('');
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if(!draft) return;
    await action('save', async () => {
      const result = await accountRequest<IntegrationConfiguration>(`mini-apps/${appId}/integration`,'PUT',draft);
      if(!alive.current) return;
      baseline.current = result; setSaved(result); setDraft(result); setMessage('Đã lưu cấu hình tích hợp.');
      onSaved(result); await refreshStatus();
    });
  }
  async function download() { await action('download', async () => { await downloadVerificationFile(appId); if(alive.current) setMessage('Đã tải file xác minh. Đặt file vào public root của website.'); await refreshStatus(); }); }
  async function verify() { await action('verify', async () => {
    const result = await accountRequest<DomainVerification>(`mini-apps/${appId}/domain-verification/verify`,'POST');
    if(!alive.current) return; setDomain(result); setMessage(result.status === 'Verified' ? 'Đã xác minh quyền kiểm soát domain.' : 'Chưa xác minh được. Xem lỗi bên dưới.'); await refreshStatus();
  }); }
  async function regenerate() { await action('regenerate', async () => {
    const result = await accountRequest<DomainVerification>(`mini-apps/${appId}/domain-verification/regenerate`,'POST');
    if(!alive.current) return; setDomain(result); setConfirm(false); setMessage('Đã tạo lại file. File cũ không còn hiệu lực; tải và đặt file mới lên website.'); await refreshStatus();
  }); }
  if(loading) return <div hidden={!active} className="mini-section" role="status"><div className="mini-skeleton" aria-label="Đang tải cấu hình tích hợp" /></div>;
  if(!draft) return <section hidden={!active} className="mini-section"><p role="alert" className="form-error">{error}</p><button className="button" onClick={() => setRetry(n=>n+1)}>Thử lại</button></section>;
  return <section hidden={!active} className="mini-configuration">
    <div className="mini-section"><h2>Cấu hình tích hợp</h2><p className="muted">Lưu thông tin website, xác minh quyền kiểm soát domain và kiểm tra các điều kiện cần bổ sung.</p>
      {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status" className="mini-save-notice">{message}</p>}
      <form onSubmit={save}><fieldset disabled={!!pending}>
        <h3>Website Mini App</h3><div className="mini-form-grid">
          <div className="form-field"><label htmlFor="integration-website">Website URL</label><input id="integration-website" type="url" maxLength={2048} value={draft.websiteUrl} onChange={e=>field('websiteUrl',e.target.value)} placeholder="https://…" /><span className="field-help">HTTPS công khai, cổng 443. URL hợp lệ cần được xác minh quyền kiểm soát domain.</span></div>
          <div className="form-field"><label htmlFor="integration-email">Email hỗ trợ</label><input id="integration-email" type="email" maxLength={254} value={draft.supportEmail} onChange={e=>field('supportEmail',e.target.value)} /></div>
        </div><div className="form-field"><label htmlFor="integration-short">Mô tả ngắn</label><textarea id="integration-short" maxLength={300} value={draft.shortDescription} onChange={e=>field('shortDescription',e.target.value)} /></div>
        <div className="form-field"><label htmlFor="integration-description">Giới thiệu chi tiết</label><textarea id="integration-description" rows={5} maxLength={10000} value={draft.description} onChange={e=>field('description',e.target.value)} /></div>
        <h3>Chính sách</h3><div className="mini-form-grid">{([['privacyPolicyUrl','Privacy Policy URL'],['termsOfServiceUrl','Terms of Service URL']] as const).map(([key,label])=><div key={key} className="form-field"><label htmlFor={`integration-${key}`}>{label}</label><input id={`integration-${key}`} type="url" maxLength={2048} value={draft[key]} onChange={e=>field(key,e.target.value)} /></div>)}</div><p className="field-help">Có thể dùng domain chính sách riêng. Trang phải truy cập HTTPS trực tiếp, công khai khi kiểm tra cấu hình.</p>
        <h3>Callback / Redirect URI</h3><label className="mini-sso-option"><input type="checkbox" checked={draft.ssoEnabled} onChange={e=>field('ssoEnabled',e.target.checked)} />Dự kiến sử dụng SSO</label><p className="field-help">Tùy chọn này chỉ xác định yêu cầu cấu hình callback. SSO sẽ được triển khai ở giai đoạn sau.</p>
        {draft.redirectUris.map((url,i)=><div key={i} className="mini-callback"><label className="form-field">Redirect URI {i+1}<input type="url" required maxLength={1024} value={url} onChange={e=>field('redirectUris',draft.redirectUris.map((value,n)=>n===i?e.target.value:value))} /></label><button type="button" className="mini-icon-button" aria-label={`Xóa redirect URI ${i+1}`} onClick={()=>field('redirectUris',draft.redirectUris.filter((_,n)=>n!==i))}>×</button></div>)}
        <button type="button" className="button button-secondary" disabled={draft.redirectUris.length>=20} onClick={()=>field('redirectUris',[...draft.redirectUris,''])}>+ Thêm redirect URI</button>
        <p className="field-help">Callback được lưu chính xác; không wildcard, userinfo hoặc fragment. HTTP localhost chỉ trong môi trường backend Development.</p>
        <div className="mini-actions"><button className="button">{pending==='save'?'Đang lưu…':'Lưu cấu hình'}</button><button type="button" className="button button-secondary" disabled={!dirty} onClick={()=>{setDraft(saved);setError('');}}>Hủy thay đổi</button><span className="field-help">{dirty?'Có thay đổi chưa lưu.':'Đã lưu.'}</span></div>
      </fieldset></form>
    </div>
    <section className="mini-domain-section"><div className="mini-page-heading"><div><h3>Xác minh domain</h3><p className="muted">Chứng minh quyền kiểm soát website bằng file tại public root.</p></div><span className={`mini-status ${domain?.status==='Verified'?'mini-verified':''}`}>{domain?.status==='Verified'?'✓ ':''}{domain?statuses[domain.status]:'Đang tải…'}</span></div>
      {statusError&&!domain&&<p role="alert" className="form-error">Không kiểm tra được trạng thái domain. {statusError}</p>}
      {dirty && <p className="mini-dirty">Lưu cấu hình trước khi tải file hoặc kiểm tra domain.</p>}
      <ol className="mini-domain-steps"><li>Domain đã lưu: <strong>{domain?.hostname ?? 'Chưa cấu hình'}</strong></li><li>Tải file xác minh và giữ nguyên tên/nội dung.</li><li>Đặt file vào thư mục public root của website.</li><li>Mở URL dưới đây để kiểm tra trực tiếp, rồi nhấn Xác minh.</li></ol>
      <div className="mini-verification-url"><span>URL ANKT sẽ kiểm tra</span>{domain?.verificationUrl?<a href={domain.verificationUrl} target="_blank" rel="noopener noreferrer">{domain.verificationUrl}</a>:<p>Tải file để lấy đường dẫn xác minh.</p>}</div>
      <dl className="mini-facts"><dt>Xác minh thành công</dt><dd>{timestamp(domain?.verifiedAt??null)}</dd><dt>Kiểm tra gần nhất</dt><dd>{timestamp(domain?.lastCheckedAt??null)}</dd><dt>Hết hạn proof</dt><dd>{timestamp(domain?.expiresAt??null)}</dd></dl>
      {domain?.message && <p className={domain.status==='Failed'?'form-error':'muted'} role={domain.status==='Failed'?'alert':undefined}>{domain.message}</p>}
      <div className="mini-actions"><button className="button button-secondary" disabled={dirty||!!pending||!domain?.hostname} onClick={()=>void download()}>{pending==='download'?'Đang tải file…':'Tải file xác minh'}</button><button className="button" disabled={dirty||!!pending||!domain?.fileName||domain.status==='Expired'} onClick={()=>void verify()}>{pending==='verify'?'Đang xác minh…':'Xác minh'}</button><button className="button button-secondary" disabled={dirty||!!pending||!domain?.hostname} onClick={()=>setConfirm(true)}>Tạo lại file</button></div>
    </section>
    <section className="mini-readiness-section"><div className="mini-page-heading"><div><h3>Checklist cấu hình</h3><p className="muted">{readiness?.configurationReady?'Thông tin cấu hình đã đầy đủ.':'Hoàn thiện các mục bắt buộc để chuẩn bị tích hợp.'}</p></div><button className="button button-secondary" disabled={dirty||checking||!!pending} onClick={()=>void refreshStatus()}>{checking?'Đang kiểm tra…':'Kiểm tra cấu hình'}</button></div>
      {statusError&&<p role="alert" className="form-error">{statusError}</p>}{checking&&<p role="status">Đang kiểm tra các URL chính sách và cấu hình đã lưu…</p>}
      <ul className="mini-readiness-list">{readiness?.checks.map(check=><li key={check.key}><span className={check.status==='passed'?'mini-pass':'mini-check-warning'} aria-label={check.status==='passed'?'Đạt':'Cần chú ý'}>{check.status==='passed'?'✓':'○'}</span><div><strong>{labels[check.key]??check.key}</strong><p>{check.message}</p></div><span className="field-help">{check.requirement==='required'?'Bắt buộc':check.requirement==='optional'?'Tùy chọn':'Thông báo'}</span></li>)}</ul>
      <div className="notice">Sandbox runtime và gửi kiểm duyệt chưa được kích hoạt. Checklist chỉ đánh giá cấu hình đã lưu.</div>
    </section>
    {confirm&&active&&<Dialog title="Tạo lại file xác minh?" close={()=>setConfirm(false)} busy={!!pending}><p>File cũ sẽ bị thu hồi và domain cần xác minh lại bằng file mới.</p><div className="mini-actions"><button className="button button-secondary" disabled={!!pending} onClick={()=>setConfirm(false)}>Hủy</button><button className="button" disabled={!!pending} onClick={()=>void regenerate()}>{pending==='regenerate'?'Đang tạo…':'Tạo lại file'}</button></div></Dialog>}
  </section>;
}
