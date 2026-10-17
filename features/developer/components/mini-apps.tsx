import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from '../navigation.web';
import { accountRequest } from '../lib/account-client';
import { categories, statusLabel, uploadLogo, type Logo, type MiniApp } from '../lib/mini-app-client';

const CreateContext = createContext<() => void>(() => {});
export const useCreateMiniApp = () => useContext(CreateContext);

export function Dialog({ title, children, close, busy = false }: { title: string; children: ReactNode; close: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="mini-dialog" aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) close(); }}>
    <div className="mini-dialog-heading"><h2>{title}</h2><button type="button" className="mini-icon-button" aria-label="Đóng" disabled={busy} onClick={close}>×</button></div>{children}
  </dialog>;
}

export function MiniAppsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const confirmed = () => setOpen(true);
    window.addEventListener('ankt:mini-app-create-confirmed', confirmed);
    return () => window.removeEventListener('ankt:mini-app-create-confirmed', confirmed);
  }, []);
  function create() {
    if (window.dispatchEvent(new Event('ankt:mini-app-before-create', { cancelable: true }))) setOpen(true);
  }
  return <CreateContext.Provider value={create}>{children}{open && <CreateMiniApp close={() => setOpen(false)} />}</CreateContext.Provider>;
}

export function LogoField({ value, onChange, busyChanged }: { value: Logo | null; onChange: (logo: Logo) => void; busyChanged: (busy: boolean) => void }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function select(file?: File) {
    if (!file || pending) return;
    setPending(true); busyChanged(true); setError('');
    try { const logo = await uploadLogo(file); if (mounted.current) onChange(logo); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Không thể tải logo.'); }
    finally { if (mounted.current) { setPending(false); busyChanged(false); } }
  }
  return <div className="form-field"><label htmlFor="mini-logo">Logo Mini App</label><div className="mini-logo-field">
    {value ? <img className="mini-logo" src={value.url} alt="Logo đã tải lên" /> : <span className="mini-logo mini-logo-placeholder" aria-hidden="true">◇</span>}
    <input id="mini-logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={pending} onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
  </div><span className="field-help">PNG, JPG, WebP · tối đa 2 MB · ảnh được cắt vuông ở giữa.</span>
    {pending && <p role="status">Đang tải logo…</p>}{error && <p role="alert" className="form-error">{error} Chọn lại tệp để thử lại.</p>}
  </div>;
}

function CreateMiniApp({ close }: { close: () => void }) {
  const [logo, setLogo] = useState<Logo | null>(null);
  const [uploading, setUploading] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  const request = useRef({ id: crypto.randomUUID(), payload: '' }); const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current || uploading) return;
    const data = new FormData(event.currentTarget); const name = String(data.get('name') ?? '').trim(); const category = String(data.get('category') ?? '');
    if (name.length < 2) { setError('Tên Mini App cần ít nhất 2 ký tự.'); return; }
    const payload = JSON.stringify({ name, category, logoUploadId: logo?.uploadId });
    if (request.current.payload && request.current.payload !== payload) request.current.id = crypto.randomUUID();
    request.current.payload = payload; submitting.current = true; setPending(true); setError('');
    try {
      const app = await accountRequest<MiniApp>('mini-apps', 'POST', { name, category, requestId: request.current.id, logoUploadId: logo?.uploadId });
      close(); window.location.assign(`/developers/console/apps/${app.appId}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể tạo Mini App. Hãy thử lại.'); }
    finally { submitting.current = false; setPending(false); }
  }
  return <Dialog title="Tạo Mini App" close={close} busy={pending || uploading}><p className="muted">Bắt đầu với thông tin cơ bản. Bạn có thể bổ sung cấu hình sau.</p>
    <form onSubmit={submit}><fieldset disabled={pending}><LogoField value={logo} onChange={setLogo} busyChanged={setUploading} />
      <div className="form-field"><label htmlFor="mini-name">Tên Mini App</label><input id="mini-name" name="name" required minLength={2} maxLength={120} autoComplete="off" autoFocus /></div>
      <div className="form-field"><label htmlFor="mini-category">Danh mục</label><select id="mini-category" name="category" required defaultValue=""><option value="" disabled>Chọn danh mục</option>{categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="mini-actions"><button type="button" className="button button-secondary" onClick={close} disabled={uploading}>Hủy</button><button className="button" disabled={uploading}>{pending ? 'Đang tạo…' : 'Tạo Mini App'}</button></div>
    </fieldset></form>
  </Dialog>;
}

export function MiniAppDashboard() {
  const create = useCreateMiniApp(); const [apps, setApps] = useState<MiniApp[]>([]); const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    accountRequest<{ items: MiniApp[]; total: number }>(`mini-apps?page=${page}`).then(data => {
      if (active) { setApps(data.items); setTotal(data.total); }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải Mini App.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, retry]);
  return <><p className="eyebrow">DEVELOPER CONSOLE</p><div className="mini-page-heading"><div><h1>Mini App của tôi</h1><p className="muted">Quản lý ứng dụng và thông tin tích hợp của bạn.</p></div><button className="button" onClick={create}>+ Tạo Mini App</button></div>
    {loading ? <div aria-label="Đang tải Mini App" role="status" className="mini-skeletons">{[1, 2, 3].map(n => <div key={n} className="mini-skeleton" />)}</div>
      : error ? <div className="notice" role="alert"><p>{error}</p><button className="button" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div>
      : !apps.length ? <section className="empty-apps"><span className="empty-symbol" aria-hidden="true">◇</span><h2>Bạn chưa có Mini App nào.</h2><p>Tạo ứng dụng đầu tiên để nhận App ID và thông tin tích hợp.</p><button className="button" onClick={create}>Tạo Mini App</button></section>
      : <div className="mini-app-list">{apps.map(app => <Link key={app.appId} className="mini-app-card" href={`/console/apps/${app.appId}`}>
        {app.logoUrl ? <img className="mini-logo" src={app.logoUrl} alt="" /> : <span className="mini-logo mini-logo-placeholder" aria-hidden="true">◇</span>}
        <div className="mini-app-card-content"><strong>{app.name}</strong><code>{app.appId}</code><span className="mini-status">{statusLabel(app.status)}</span></div><span aria-hidden="true">→</span>
      </Link>)}</div>}
    {!loading && total > 20 && <nav className="mini-actions" aria-label="Phân trang"><button className="button button-secondary" disabled={page === 1} onClick={() => setPage(n => n - 1)}>Trước</button><span>Trang {page} / {Math.ceil(total / 20)}</span><button className="button button-secondary" disabled={page * 20 >= total} onClick={() => setPage(n => n + 1)}>Sau</button></nav>}
  </>;
}
