import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link, { useRouter } from '../navigation.web';
import { accountRequest } from '../lib/account-client';
import { categories, statusLabel, type Credentials, type Logo, type MiniApp } from '../lib/mini-app-client';
import { Dialog, LogoField } from './mini-apps';
import { MiniAppConfiguration } from './mini-app-configuration';
import type { IntegrationConfiguration } from '../lib/mini-app-integration';
import { MiniAppSso } from './mini-app-sso';
import type { SsoConfiguration } from '../lib/mini-app-sso';

const tabs = ['Tổng quan', 'Thông tin ứng dụng', 'Thông tin tích hợp', 'Callback', 'Sandbox', 'Kiểm duyệt', 'Hoạt động', 'Cấu hình tích hợp', 'Đăng nhập ANKT'];
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Không thể thực hiện. Vui lòng thử lại.';

function Integration({ appId }: { appId: string }) {
  const [credentials, setCredentials] = useState<Credentials | null>(null); const [error, setError] = useState('');
  const [pending, setPending] = useState(true); const [confirm, setConfirm] = useState(false); const [message, setMessage] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    function visibility() {
      generation.current++; setCredentials(null);
      if (document.visibilityState === 'visible') void load();
    }
    async function load() {
      const current = ++generation.current; setPending(true); setError('');
      try { const data = await accountRequest<Credentials>(`mini-apps/${appId}/credentials`); if (active && current === generation.current) setCredentials(data); }
      catch (e) { if (active && current === generation.current) setError(errorText(e)); }
      finally { if (active && current === generation.current) setPending(false); }
    }
    void load(); document.addEventListener('visibilitychange', visibility);
    // Invalidate rotation responses too, including responses received after this tab unmounts.
    const invalidate = () => { generation.current++; };
    return () => { active = false; invalidate(); document.removeEventListener('visibilitychange', visibility); };
  }, [appId]);
  async function rotate() {
    if (pending) return; setPending(true); setError(''); setMessage('');
    const current = ++generation.current;
    try {
      const data = await accountRequest<Credentials>(`mini-apps/${appId}/credentials/rotate`, 'POST');
      if (current === generation.current) { setCredentials(data); setConfirm(false); setMessage('Đã cấp lại Secret. Secret cũ đã bị thu hồi.'); }
    } catch (e) { if (current === generation.current) setError(errorText(e)); }
    finally { if (current === generation.current) setPending(false); }
  }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setMessage(`Đã sao chép ${label}.`); }
    catch { setError('Trình duyệt chưa cho phép sao chép. Bạn có thể chọn trường và sao chép thủ công.'); }
  }
  return <section className="mini-section"><h2>Thông tin tích hợp</h2><div className="notice"><strong>Client Secret dành cho backend của đối tác.</strong><p>Giữ bí mật trên máy chủ. Ứng dụng chỉ có frontend dùng Public Client + PKCE tại tab Đăng nhập ANKT.</p></div>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {pending && !credentials && <p role="status">Đang tải thông tin tích hợp…</p>}
    {credentials && <>{[['Client Key', credentials.clientKey], ['Client Secret', credentials.clientSecret]].map(([label, value]) => <div className="form-field" key={label}><label>{label}<input className="mini-credential" value={value} readOnly autoComplete="off" spellCheck={false} /></label><button type="button" className="button button-secondary" onClick={() => void copy(value, label)}>Copy {label}</button></div>)}
      <button className="button" disabled={pending} onClick={() => setConfirm(true)}>Cấp lại Secret</button></>}
    {!pending && !credentials && error && <button className="button" onClick={() => { window.location.reload(); }}>Thử lại</button>}
    {confirm && <Dialog title="Cấp lại Client Secret?" close={() => setConfirm(false)} busy={pending}><p>Secret cũ sẽ ngừng hoạt động ngay. Sau khi cấp lại, hãy cập nhật Secret mới trên backend của bạn.</p><div className="mini-actions"><button className="button button-secondary" disabled={pending} onClick={() => setConfirm(false)}>Hủy</button><button className="button" disabled={pending} onClick={() => void rotate()}>{pending ? 'Đang cấp lại…' : 'Xác nhận cấp lại'}</button></div></Dialog>}
  </section>;
}

export function MiniAppDetail({ appId }: { appId: string }) {
  const allowLeave = useRef(false);
  const router = useRouter(); const [app, setApp] = useState<MiniApp | null>(null); const [draft, setDraft] = useState<MiniApp | null>(null);
  const [callbacks, setCallbacks] = useState<string[]>([]); const [savedCallbacks, setSavedCallbacks] = useState<string[]>([]);
  const [activity, setActivity] = useState<{ action: string; createdAt: string }[]>([]);
  const [tab, setTab] = useState(0); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true); const [retry, setRetry] = useState(0); const [pending, setPending] = useState(false);
  const [logo, setLogo] = useState<Logo | null>(null); const [uploading, setUploading] = useState(false); const [remove, setRemove] = useState(false);
  const [leave, setLeave] = useState<string | null>(null);
  const [activityRetry, setActivityRetry] = useState(0);
  const [configurationDirty,setConfigurationDirty] = useState(false); const [configurationBusy,setConfigurationBusy] = useState(false); const [configurationReset,setConfigurationReset] = useState(0);
  const dirty = configurationDirty || configurationBusy || uploading || !!logo || JSON.stringify(app) !== JSON.stringify(draft) || JSON.stringify(callbacks) !== JSON.stringify(savedCallbacks);
  const configurationSaved = useCallback((configuration: IntegrationConfiguration) => {
    const merge = (previous: MiniApp | null) => previous ? { ...previous, websiteUrl:configuration.websiteUrl,
      supportEmail:configuration.supportEmail,shortDescription:configuration.shortDescription,description:configuration.description,
      privacyPolicyUrl:configuration.privacyPolicyUrl,termsOfServiceUrl:configuration.termsOfServiceUrl } : previous;
    setApp(merge); setDraft(merge); setCallbacks(configuration.redirectUris); setSavedCallbacks(configuration.redirectUris);
  },[]);
  const ssoSaved=useCallback((configuration:SsoConfiguration)=>{
    const sandbox=configuration.clients.find(client=>client.environment==='Sandbox');
    if(sandbox){setCallbacks(sandbox.redirectUris);setSavedCallbacks(sandbox.redirectUris);}
  },[]);
  const submitting = useRef(false);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    Promise.all([accountRequest<MiniApp>(`mini-apps/${appId}`), accountRequest<string[]>(`mini-apps/${appId}/redirect-uris`)]).then(([data, urls]) => {
      if (active) { setApp(data); setDraft(data); setCallbacks(urls); setSavedCallbacks(urls); }
    }).catch(e => { if (active) setError(errorText(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appId, retry]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => { if (!allowLeave.current) { e.preventDefault(); e.returnValue = ''; } };
    const create = (e: Event) => { if (!allowLeave.current) { e.preventDefault(); setLeave('create'); } };
    const click = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.download || e.ctrlKey || e.metaKey || e.shiftKey || anchor.href === window.location.href) return;
      e.preventDefault(); e.stopPropagation(); setLeave(anchor.href);
    };
    window.addEventListener('beforeunload', unload); window.addEventListener('ankt:mini-app-before-create', create); document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('ankt:mini-app-before-create', create); document.removeEventListener('click', click, true); };
  }, [dirty]);
  useEffect(() => {
    if (tab !== 6) return; let active = true;
    accountRequest<typeof activity>(`mini-apps/${appId}/activity`).then(data => { if (active) setActivity(data); }).catch(e => { if (active) setError(errorText(e)); });
    return () => { active = false; };
  }, [appId, tab, activityRetry]);
  function field(key: keyof MiniApp, value: string) { setDraft(previous => previous ? { ...previous, [key]: value } : previous); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (submitting.current || uploading || !draft) return;
    submitting.current = true; setPending(true); setError(''); setMessage('');
    try {
      if (tab === 3) {
        const urls = await accountRequest<string[]>(`mini-apps/${appId}/redirect-uris`, 'PUT', { redirectUris: callbacks });
        setCallbacks(urls); setSavedCallbacks(urls);
      } else {
        const { name, category, shortDescription, description, websiteUrl, supportEmail, privacyPolicyUrl, termsOfServiceUrl } = draft;
        const updated = await accountRequest<MiniApp>(`mini-apps/${appId}`, 'PATCH', { name, category, shortDescription: shortDescription ?? '', description: description ?? '', websiteUrl: websiteUrl ?? '', supportEmail: supportEmail ?? '', privacyPolicyUrl: privacyPolicyUrl ?? '', termsOfServiceUrl: termsOfServiceUrl ?? '', logoUploadId: logo?.uploadId });
        setApp(updated); setDraft(updated); setLogo(null);
      }
      setMessage('Đã lưu bản nháp.');
    } catch (e) { setError(errorText(e)); }
    finally { submitting.current = false; setPending(false); }
  }
  async function deleteApp() {
    if (submitting.current) return; submitting.current = true; setPending(true); setError('');
    try { await accountRequest(`mini-apps/${appId}`, 'DELETE'); allowLeave.current = true; setApp(null); setDraft(null); setLogo(null); setCallbacks([]); setSavedCallbacks([]); router.replace('/console'); }
    catch (e) { setError(errorText(e)); }
    finally { submitting.current = false; setPending(false); }
  }
  if (loading) return <div className="mini-skeletons" role="status" aria-label="Đang tải Mini App"><div className="mini-skeleton" /><div className="mini-skeleton" /></div>;
  if (!app || !draft) return <div className="notice"><h1>Chưa mở được Mini App</h1><p role="alert">{error || 'Không tìm thấy ứng dụng.'}</p><button className="button" onClick={() => setRetry(n => n + 1)}>Thử lại</button><Link className="inline-link" href="/console">Về danh sách</Link></div>;
  const incomplete = [['Logo', app.logoUrl], ['Mô tả ngắn', app.shortDescription], ['Website', app.websiteUrl], ['Email hỗ trợ', app.supportEmail], ['Chính sách riêng tư', app.privacyPolicyUrl], ['Điều khoản sử dụng', app.termsOfServiceUrl]];
  return <><Link className="inline-link" href="/console">← Mini App của tôi</Link><header className="mini-detail-heading">{app.logoUrl ? <img className="mini-logo" src={app.logoUrl} alt="" /> : <span className="mini-logo mini-logo-placeholder">◇</span>}<div><h1>{app.name}</h1><code>{app.appId}</code><p><span className="mini-status">{statusLabel(app.status)}</span></p></div></header>
    <div className="mini-tabs" role="tablist" aria-label="Cấu hình Mini App">{tabs.map((label, n) => <button key={label} id={`mini-tab-${n}`} role="tab" type="button" disabled={uploading || pending || configurationBusy} aria-selected={tab === n} aria-controls="mini-panel" onClick={() => {
      if(n!==tab && (configurationDirty || ((n===7 || n===8) && dirty))) {setLeave(`tab:${n}`);return;}
      setTab(n); setMessage(''); setError('');
    }}>{label}</button>)}</div>
    {dirty && <p className="mini-dirty" role="status">Có thay đổi chưa lưu.</p>}{error && <p className="form-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <div id="mini-panel" role="tabpanel" aria-labelledby={`mini-tab-${tab}`}>
      {tab === 0 && <section className="mini-section"><h2>Tổng quan</h2><dl className="mini-facts"><dt>Tên</dt><dd>{app.name}</dd><dt>App ID</dt><dd><code>{app.appId}</code></dd><dt>Danh mục</dt><dd>{categories.find(([id]) => id === app.category)?.[1] ?? app.category}</dd><dt>Ngày tạo</dt><dd>{date(app.createdAt)}</dd><dt>Cập nhật</dt><dd>{date(app.updatedAt)}</dd><dt>Trạng thái</dt><dd>{statusLabel(app.status)}</dd></dl><button className="button button-secondary mini-danger" onClick={() => setRemove(true)}>Xóa Mini App</button></section>}
      {tab === 1 && <form onSubmit={save} className="mini-section"><h2>Thông tin ứng dụng</h2><fieldset disabled={pending}>
        <LogoField value={logo ?? (app.logoUrl ? { uploadId: '', url: app.logoUrl } : null)} onChange={setLogo} busyChanged={setUploading} />
        <div className="mini-form-grid"><div className="form-field"><label htmlFor="app-name">Tên Mini App</label><input id="app-name" required minLength={2} maxLength={120} value={draft.name} onChange={e => field('name', e.target.value)} /></div>
          <div className="form-field"><label htmlFor="app-category">Danh mục</label><select id="app-category" value={draft.category} onChange={e => field('category', e.target.value)}>{categories.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></div></div>
        <div className="form-field"><label htmlFor="shortDescription">Mô tả ngắn</label><textarea id="shortDescription" maxLength={300} value={draft.shortDescription ?? ''} onChange={e => field('shortDescription', e.target.value)} /></div>
        <div className="form-field"><label htmlFor="description">Giới thiệu chi tiết</label><textarea id="description" rows={6} maxLength={10000} value={draft.description ?? ''} onChange={e => field('description', e.target.value)} /></div>
        <div className="mini-form-grid">{([['websiteUrl', 'Website URL', 'url'], ['supportEmail', 'Email hỗ trợ', 'email'], ['privacyPolicyUrl', 'Privacy Policy URL', 'url'], ['termsOfServiceUrl', 'Terms of Service URL', 'url']] as const).map(([key, label, type]) => <div className="form-field" key={key}><label htmlFor={key}>{label}</label><input id={key} type={type} maxLength={type === 'email' ? 254 : 2048} value={draft[key] ?? ''} onChange={e => field(key, e.target.value)} /></div>)}</div>
        <button className="button" disabled={uploading}>{pending ? 'Đang lưu…' : 'Lưu bản nháp'}</button>
      </fieldset></form>}
      {tab === 2 && <Integration key={appId} appId={appId} />}
      {tab === 3 && <form className="mini-section" onSubmit={save}><h2>Callback / Redirect URI</h2><p className="muted">Dùng URL HTTPS chính xác, không wildcard hoặc fragment. HTTP localhost chỉ được phép khi backend chạy ở Development.</p><fieldset disabled={pending}>
        {callbacks.map((url, i) => <div key={i} className="mini-callback"><label className="form-field">Callback {i + 1}<input aria-label={`Callback ${i + 1}`} type="url" required maxLength={1024} value={url} onChange={e => setCallbacks(values => values.map((v, n) => n === i ? e.target.value : v))} /></label><button type="button" className="mini-icon-button" aria-label={`Xóa callback ${i + 1}`} onClick={() => setCallbacks(values => values.filter((_, n) => n !== i))}>×</button></div>)}
        <div className="mini-actions"><button type="button" className="button button-secondary" disabled={callbacks.length >= 20} onClick={() => setCallbacks(values => [...values, ''])}>+ Thêm URI</button><button className="button">{pending ? 'Đang lưu…' : 'Lưu callback'}</button></div>
      </fieldset></form>}
      {tab === 4 && <section className="mini-section"><h2>Sandbox</h2><p>Cấu hình client, callback và scope thử nghiệm tại tab Đăng nhập ANKT. Sandbox không cấp quyền xuất bản.</p><button className="button" onClick={()=>dirty?setLeave('tab:8'):setTab(8)}>Cấu hình Sandbox</button></section>}
      {tab === 5 && <section className="mini-section"><h2>Chuẩn bị kiểm duyệt</h2><p className="muted">Bổ sung thông tin bên dưới. Chức năng gửi duyệt sẽ mở ở giai đoạn sau.</p><ul className="mini-checklist">{incomplete.map(([label, value]) => <li key={label}><span aria-label={value ? 'Đã có' : 'Còn thiếu'}>{value ? '✓' : '○'}</span> {label}</li>)}</ul></section>}
      {tab === 6 && <section className="mini-section"><h2>Hoạt động gần đây</h2>{activity.length ? <ul className="mini-activity">{activity.map((a, i) => <li key={i}><code>{a.action}</code><time>{date(a.createdAt)}</time></li>)}</ul> : <p>Chưa có hoạt động để hiển thị.</p>}<button className="button button-secondary" onClick={() => setActivityRetry(n => n + 1)}>Tải lại</button></section>}
      {tab === 7 && <MiniAppConfiguration appId={appId} active resetSignal={configurationReset} onDirty={setConfigurationDirty} onBusy={setConfigurationBusy} onSaved={configurationSaved} />}
      {tab === 8 && <MiniAppSso appId={appId} resetSignal={configurationReset} onDirty={setConfigurationDirty} onBusy={setConfigurationBusy} onSaved={ssoSaved}/>}
    </div>
    {remove && <Dialog title="Xóa Mini App?" close={() => setRemove(false)} busy={pending}><p>Ứng dụng sẽ được ẩn và thông tin tích hợp bị thu hồi. Bạn sẽ không thể truy cập lại ứng dụng từ Console.</p><div className="mini-actions"><button className="button button-secondary" disabled={pending} onClick={() => setRemove(false)}>Hủy</button><button className="button mini-danger" disabled={pending} onClick={() => void deleteApp()}>{pending ? 'Đang xóa…' : 'Xóa Mini App'}</button></div></Dialog>}
    {leave && <Dialog title="Có thay đổi chưa lưu" close={() => setLeave(null)}><p>Rời trang sẽ mất các thay đổi chưa lưu.</p><div className="mini-actions"><button className="button" onClick={() => setLeave(null)}>Tiếp tục chỉnh sửa</button><button className="button button-secondary" disabled={uploading || configurationBusy} onClick={() => {
      if (leave === 'create' || leave.startsWith('tab:')) { setDraft(app); setLogo(null); setCallbacks(savedCallbacks); setConfigurationReset(n=>n+1); setConfigurationDirty(false); setLeave(null); if(leave==='create') window.dispatchEvent(new Event('ankt:mini-app-create-confirmed')); else setTab(Number(leave.slice(4))); }
      else { allowLeave.current = true; window.location.assign(leave); }
    }}>Rời trang</button></div></Dialog>}
  </>;
}
