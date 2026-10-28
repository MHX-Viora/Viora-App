import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link, { useRouter } from '../navigation.web';
import { accountRequest } from '../lib/account-client';
import { categories, statusLabel, type Logo, type MiniApp } from '../lib/mini-app-client';
import { Dialog, LogoField } from './mini-apps';
import { MiniAppConfiguration } from './mini-app-configuration';
import type { IntegrationConfiguration } from '../lib/mini-app-integration';
import { MiniAppBridgeIntegration } from './mini-app-bridge-integration';
import { MiniAppReview } from './mini-app-review';
import { reviewFocus } from '../lib/review-notifications';
import { ConsoleBreadcrumb } from './console-ui';

const tabs = [[0, 'Tổng quan'], [1, 'Thông tin ứng dụng'], [6, 'Cấu hình tích hợp'], [2, 'Tích hợp Auth Bridge'], [3, 'Sandbox'], [4, 'Xét duyệt và phát hành'], [5, 'Hoạt động']] as const;
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Không thể thực hiện. Vui lòng thử lại.';

export function MiniAppDetail({ appId }: { appId: string }) {
  const allowLeave = useRef(false);
  const router = useRouter(); const [app, setApp] = useState<MiniApp | null>(null); const [draft, setDraft] = useState<MiniApp | null>(null);
  const [activity, setActivity] = useState<{ action: string; createdAt: string }[]>([]);
  const [focus] = useState(() => typeof window === 'undefined' ? null : reviewFocus(window.location.search));
  const [tab, setTab] = useState(focus ? 4 : 0); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true); const [retry, setRetry] = useState(0); const [pending, setPending] = useState(false);
  const [logo, setLogo] = useState<Logo | null>(null); const [uploading, setUploading] = useState(false); const [remove, setRemove] = useState(false);
  const [leave, setLeave] = useState<string | null>(null);
  const [activityRetry, setActivityRetry] = useState(0);
  const [configurationDirty,setConfigurationDirty] = useState(false); const [configurationBusy,setConfigurationBusy] = useState(false); const [configurationReset,setConfigurationReset] = useState(0);
  const dirty = configurationDirty || configurationBusy || uploading || !!logo || JSON.stringify(app) !== JSON.stringify(draft);
  const configurationSaved = useCallback((configuration: IntegrationConfiguration) => {
    const merge = (previous: MiniApp | null) => previous ? { ...previous, websiteUrl:configuration.websiteUrl,
      supportEmail:configuration.supportEmail,shortDescription:configuration.shortDescription,description:configuration.description,
      privacyPolicyUrl:configuration.privacyPolicyUrl,termsOfServiceUrl:configuration.termsOfServiceUrl } : previous;
    setApp(merge); setDraft(merge);
  },[]);
  const reviewAppStatus = useCallback((status: string) => { setApp(previous => previous ? { ...previous, status } : previous); setDraft(previous => previous ? { ...previous, status } : previous); }, []);
  const submitting = useRef(false);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    accountRequest<MiniApp>(`mini-apps/${appId}`).then(data => {
      if (active) { setApp(data); setDraft(data); }
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
    if (tab !== 5) return; let active = true;
    accountRequest<typeof activity>(`mini-apps/${appId}/activity`).then(data => { if (active) setActivity(data); }).catch(e => { if (active) setError(errorText(e)); });
    return () => { active = false; };
  }, [appId, tab, activityRetry]);
  function field(key: keyof MiniApp, value: string) { setDraft(previous => previous ? { ...previous, [key]: value } : previous); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (submitting.current || uploading || !draft) return;
    submitting.current = true; setPending(true); setError(''); setMessage('');
    try {
        const { name, category, shortDescription, description, websiteUrl, supportEmail, privacyPolicyUrl, termsOfServiceUrl } = draft;
        const updated = await accountRequest<MiniApp>(`mini-apps/${appId}`, 'PATCH', { name, category, shortDescription: shortDescription ?? '', description: description ?? '', websiteUrl: websiteUrl ?? '', supportEmail: supportEmail ?? '', privacyPolicyUrl: privacyPolicyUrl ?? '', termsOfServiceUrl: termsOfServiceUrl ?? '', logoUploadId: logo?.uploadId });
        setApp(updated); setDraft(updated); setLogo(null);
      setMessage('Đã lưu bản nháp.');
    } catch (e) { setError(errorText(e)); }
    finally { submitting.current = false; setPending(false); }
  }
  async function deleteApp() {
    if (submitting.current) return; submitting.current = true; setPending(true); setError('');
    try { await accountRequest(`mini-apps/${appId}`, 'DELETE'); allowLeave.current = true; setApp(null); setDraft(null); setLogo(null); router.replace('/console'); }
    catch (e) { setError(errorText(e)); }
    finally { submitting.current = false; setPending(false); }
  }
  if (loading) return <div className="mini-skeletons" role="status" aria-label="Đang tải Mini App"><div className="mini-skeleton" /><div className="mini-skeleton" /></div>;
  if (!app || !draft) return <div className="notice"><h1>Chưa mở được Mini App</h1><p role="alert">{error || 'Không tìm thấy ứng dụng.'}</p><button className="button" onClick={() => setRetry(n => n + 1)}>Thử lại</button><Link className="inline-link" href="/console/apps">Về danh sách</Link></div>;
  return <><ConsoleBreadcrumb current={app.name} parent={{ label: 'Mini App của tôi', href: '/console/apps' }} /><header className="mini-detail-heading">{app.logoUrl ? <img className="mini-logo" src={app.logoUrl} alt="" /> : <span className="mini-logo mini-logo-placeholder">◇</span>}<div><h1>{app.name}</h1><code>{app.appId}</code><p><span className="mini-status" data-status={app.status}>{statusLabel(app.status)}</span></p></div></header>
    <div className="mini-tabs" role="tablist" aria-label="Cấu hình Mini App">{tabs.map(([n, label]) => <button key={label} id={`mini-tab-${n}`} role="tab" type="button" disabled={uploading || pending || configurationBusy} aria-selected={tab === n} aria-controls="mini-panel" onClick={() => {
      if(n!==tab && (configurationDirty || (n===6 && dirty))) {setLeave(`tab:${n}`);return;}
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
      {tab === 2 && <MiniAppBridgeIntegration key={appId} appId={appId} />}
      {tab === 3 && <section className="mini-section"><h2>Sandbox</h2><p>Mở website đã đăng ký trong runtime thử nghiệm. Lưu các thay đổi cấu hình trước khi mở phiên.</p><Link className="button" href={'/console/apps/'+appId+'/sandbox'}>Mở Sandbox</Link><button className="button button-secondary" onClick={()=>dirty?setLeave('tab:2'):setTab(2)}>Tích hợp Auth Bridge</button></section>}
      {tab === 4 && <MiniAppReview appId={appId} resetSignal={configurationReset} focus={focus ?? undefined} onAppStatus={reviewAppStatus} onBusy={setConfigurationBusy} onDirty={setConfigurationDirty} onConfigure={field => {
        const target = field.startsWith('sandbox.') ? 2 : field.startsWith('production.') ? 4 : 6;
        if (dirty) setLeave('tab:' + target); else setTab(target);
      }} />}
      {tab === 5 && <section className="mini-section"><h2>Hoạt động gần đây</h2>{activity.length ? <ul className="mini-activity">{activity.map((a, i) => <li key={i}><code>{a.action}</code><time>{date(a.createdAt)}</time></li>)}</ul> : <p>Chưa có hoạt động để hiển thị.</p>}<button className="button button-secondary" onClick={() => setActivityRetry(n => n + 1)}>Tải lại</button></section>}
      {tab === 6 && <MiniAppConfiguration appId={appId} active resetSignal={configurationReset} onDirty={setConfigurationDirty} onBusy={setConfigurationBusy} onSaved={configurationSaved} />}

    </div>
    {remove && <Dialog title="Xóa Mini App?" close={() => setRemove(false)} busy={pending}><p>Ứng dụng sẽ được ẩn và thông tin tích hợp bị thu hồi. Bạn sẽ không thể truy cập lại ứng dụng từ Console.</p><div className="mini-actions"><button className="button button-secondary" disabled={pending} onClick={() => setRemove(false)}>Hủy</button><button className="button mini-danger" disabled={pending} onClick={() => void deleteApp()}>{pending ? 'Đang xóa…' : 'Xóa Mini App'}</button></div></Dialog>}
    {leave && <Dialog title="Có thay đổi chưa lưu" close={() => setLeave(null)}><p>Rời trang sẽ mất các thay đổi chưa lưu.</p><div className="mini-actions"><button className="button" onClick={() => setLeave(null)}>Tiếp tục chỉnh sửa</button><button className="button button-secondary" disabled={uploading || configurationBusy} onClick={() => {
      if (leave === 'create' || leave.startsWith('tab:')) { setDraft(app); setLogo(null); setConfigurationReset(n=>n+1); setConfigurationDirty(false); setLeave(null); if(leave==='create') window.dispatchEvent(new Event('ankt:mini-app-create-confirmed')); else setTab(Number(leave.slice(4))); }
      else { allowLeave.current = true; window.location.assign(leave); }
    }}>Rời trang</button></div></Dialog>}
  </>;
}
