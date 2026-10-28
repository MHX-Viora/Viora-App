import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '../navigation.web';
import { accountRequest, AccountApiError } from '../lib/account-client';
import { reviewClient, ReviewRequestSequence, reviewError, type Page, type Review, type ReviewDetail, type ReviewReadiness, type ReviewSubmit, type Version, type VersionCreate, type VersionDetail } from '../lib/mini-app-review';
import { publishingClient, type Publication } from '../lib/mini-app-publishing';
import { Dialog } from './mini-apps';
import { ReviewChecklist, ReviewHistoryDetail, VersionSnapshot, reviewStatus, reviewTime } from './review-history';
import { MiniAppProductionDraft } from './mini-app-production-draft';
import { MiniAppPublishing } from './mini-app-publishing';

type View = { versions: Page<Version>; reviews: Page<Review>; latestReview: Review | undefined; publications: Page<Publication>; selected: VersionDetail | null;
  live: VersionDetail | null; readiness: ReviewReadiness | null; appVersion: string };
type Command = { kind: 'create'; request: VersionCreate } | { kind: 'submit'; request: ReviewSubmit };
export function MiniAppReview({ appId, resetSignal = 0, focus, productionFocus = false, onBusy, onDirty, onConfigure, onAppStatus }: { appId: string; resetSignal?: number; focus?: { reviewId?: string; versionId?: string }; productionFocus?: boolean; onBusy: (value: boolean) => void; onDirty: (value: boolean) => void; onConfigure: (field: string) => void; onAppStatus: (status: string) => void }) {
  const [view, setView] = useState<View | null>(null), [loading, setLoading] = useState(true), [working, setWorking] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [name, setName] = useState('');
  const [confirmation, setConfirmation] = useState<ReviewSubmit | null>(null), [retryCommand, setRetryCommand] = useState<Command | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null), [historyLoading, setHistoryLoading] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false), [publisherBusy, setPublisherBusy] = useState(false), [editorDirty, setEditorDirty] = useState(false);
  const [productionOpen, setProductionOpen] = useState(productionFocus);
  const [focusReady, setFocusReady] = useState(!focus?.reviewId);
  const sequence = useRef(new ReviewRequestSequence()), commands = useRef(new ReviewRequestSequence()), history = useRef(new ReviewRequestSequence());
  const selected = useRef<string | null>(focus?.versionId ?? null), page = useRef(1), running = useRef(false);
  const load = useCallback(async () => {
    const current = sequence.current.begin(); setLoading(true); setView(null); setError('');
    try {
      const [versions, reviews, publications, app] = await Promise.all([reviewClient.versions(appId), reviewClient.reviews(appId, page.current), publishingClient.publications(appId),
        accountRequest<{ status: unknown; appVersion: string }>(`mini-apps/${appId}`)]);
      const id = selected.current ?? versions.items.find(v => v.state === 'Draft')?.id ?? versions.items[0]?.id;
      const liveId = publications.items.find(p => p.status === 'Published')?.versionId;
      const latestReview = reviews.page === 1 ? reviews.items[0] : (await reviewClient.reviews(appId, 1, 1)).items[0];
      const chosen = id ? await reviewClient.version(appId, id) : null;
      const live = liveId ? liveId === id ? chosen : await reviewClient.version(appId, liveId) : null;
      let readiness: ReviewReadiness | null = null;
      if (chosen?.version.state === 'Draft') {
        try { readiness = await reviewClient.readiness(appId); }
        catch (e) { if (sequence.current.isCurrent(current)) setError(reviewError(e)); }
        if (readiness && (readiness.versionId !== id || readiness.snapshotHash !== chosen.version.snapshotHash || readiness.concurrencyToken !== chosen.version.concurrencyToken)) readiness = null;
      }
      if (sequence.current.isCurrent(current)) { selected.current = id ?? null;
        if (typeof app.status === 'string' && ['Draft', 'ConfigurationIncomplete', 'PendingReview', 'ChangesRequested', 'Rejected', 'Approved', 'Published', 'Suspended'].includes(app.status)) onAppStatus(app.status);
        setView({ versions, reviews, latestReview, publications, selected: chosen, live, readiness, appVersion: app.appVersion }); }
    } catch (e) { if (sequence.current.isCurrent(current)) setError(reviewError(e)); }
    finally { if (sequence.current.isCurrent(current)) setLoading(false); }
  }, [appId, onAppStatus]);
  useEffect(() => { const reads = sequence.current, writes = commands.current, details = history.current;
    void load(); return () => { reads.invalidate(); writes.invalidate(); details.invalidate(); }; }, [load]);
  useEffect(() => { onBusy(working || editorBusy || publisherBusy); return () => onBusy(false); }, [working, editorBusy, publisherBusy, onBusy]);
  useEffect(() => { onDirty(name.trim().length > 0 || editorDirty); return () => onDirty(false); }, [name, editorDirty, onDirty]);
  useEffect(() => { setName(''); }, [resetSignal]);
  const showReview = useCallback(async (id: string) => {
    const current = history.current.begin(); setHistoryLoading(true); setDetail(null);
    try { const value = await reviewClient.review(appId, id); if (history.current.isCurrent(current)) {
      if (focus?.reviewId === id && focus.versionId && focus.versionId !== value.review.versionId) throw new Error('Review/version mismatch');
      if (focus?.reviewId === id) setFocusReady(true);
      setDetail(value); if (focus?.reviewId === id && !focus.versionId) { selected.current = value.review.versionId; void load(); }
    } }
    catch (e) { if (history.current.isCurrent(current)) setError(reviewError(e)); }
    finally { if (history.current.isCurrent(current)) setHistoryLoading(false); }
  }, [appId, focus?.reviewId, focus?.versionId, load]);
  useEffect(() => { if (focus?.reviewId) void showReview(focus.reviewId); }, [focus?.reviewId, showReview]);
  async function run(command: Command) {
    if (running.current) return; running.current = true;
    const current = commands.current.begin(); setWorking(true); setRetryCommand(command); setError(''); setMessage('');
    try {
      const result = command.kind === 'create' ? await reviewClient.createVersion(appId, command.request) : await reviewClient.submit(appId, command.request);
      if (!commands.current.isCurrent(current)) return;
      selected.current = command.kind === 'create' ? result.id : (result as Review).versionId;
      setName(''); setRetryCommand(null); setConfirmation(null); setDetail(null); history.current.invalidate();
      await load(); if (commands.current.isCurrent(current)) setMessage(command.kind === 'create' ? 'Đã tạo bản nháp từ cấu hình hiện tại.' : 'Đã gửi đúng phiên bản xét duyệt. Theo dõi kết quả trong lịch sử và thông báo.');
    } catch (e) {
      if (!commands.current.isCurrent(current)) return;
      setConfirmation(null);
      if (e instanceof AccountApiError && e.status >= 400 && e.status < 500) { setRetryCommand(null); await load(); }
      if (commands.current.isCurrent(current)) setError(reviewError(e));
    } finally { if (commands.current.isCurrent(current)) setWorking(false); running.current = false; }
  }
  const busy = working || loading || !!retryCommand || editorBusy || publisherBusy || editorDirty || !focusReady;
  const draft = view?.versions.items.find(v => v.state === 'Draft');
  return <section className="mini-section review-workspace" aria-labelledby="review-heading" aria-busy={working || loading}>
    <header className="review-heading"><div><h2 id="review-heading">Xét duyệt và phát hành</h2><p>Gửi một phiên bản cố định để quản trị viên xem xét. Bản nháp, bản đã gửi và bản đang phát hành được theo dõi riêng.</p></div>
      <button type="button" className="button button-secondary" disabled={working || loading || editorBusy || publisherBusy || editorDirty} onClick={() => { setRetryCommand(null); void load(); }}>Kiểm tra lại trạng thái</button></header>
    {error && <p className="notice" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}
    {retryCommand && !working && <button type="button" className="button" onClick={() => void run(retryCommand)}>Thử lại cùng yêu cầu</button>}
    {loading && <div className="mini-skeletons" role="status" aria-label="Đang tải xét duyệt"><div className="mini-skeleton" /></div>}
    {view && <><div className="review-state-row">
      <div><h3>Bản nháp</h3><p>{draft ? `${draft.versionName} · #${draft.versionCode}` : 'Chưa có bản nháp'}</p></div>
      <div><h3>Bản đã gửi</h3><p>{view.latestReview ? `#${view.latestReview.versionCode} · ${reviewStatus[view.latestReview.status]}` : 'Chưa gửi xét duyệt'}</p></div>
      <div><h3>Đang phát hành</h3><p>{view.live ? `${view.live.version.versionName} · #${view.live.version.versionCode}` : 'Chưa phát hành'}</p></div>
    </div>
      {!draft && <form onSubmit={e => { e.preventDefault(); if (!busy && name.trim()) void run({ kind: 'create', request: { requestId: crypto.randomUUID(), appVersion: view.appVersion, versionName: name.trim() } }); }}>
        <fieldset disabled={busy}><legend>Tạo bản nháp từ cấu hình hiện tại</legend><label htmlFor="review-version-name">Tên phiên bản</label><input id="review-version-name" value={name} required maxLength={80} placeholder="Ví dụ: 1.1.0" onChange={e => setName(e.target.value)} />
          <p className="field-help">Lưu thông tin và cấu hình ứng dụng, tạo bản nháp, sau đó mở Sandbox và hoàn tất đăng nhập Auth Bridge. Quay lại kiểm tra trạng thái và gửi duyệt trong vòng 5 phút.</p><button className="button" disabled={!name.trim()}>Tạo bản nháp mới</button></fieldset>
      </form>}
      {view.versions.items.length > 0 && <><label htmlFor="review-version">Phiên bản đang xem</label><select id="review-version" disabled={busy} value={view.selected?.version.id ?? ''} onChange={e => { selected.current = e.target.value; void load(); }}>
        {view.selected && !view.versions.items.some(v => v.id === view.selected!.version.id) && <option value={view.selected.version.id}>{view.selected.version.versionName} · #{view.selected.version.versionCode}</option>}
        {view.versions.items.map(v => <option key={v.id} value={v.id}>{v.versionName} · #{v.versionCode} · {reviewStatus[v.state]}</option>)}</select>
        {view.selected && <><details><summary>{view.selected.version.state === 'Draft' ? 'Xem nội dung bản nháp' : 'Xem nội dung phiên bản đã khóa'}</summary><VersionSnapshot snapshot={view.selected.snapshot} title={view.selected.version.state === 'Draft' ? 'Nội dung bản nháp' : 'Nội dung phiên bản đã khóa'} /></details>
          {view.selected.version.state === 'Draft' && <details open={productionOpen} onToggle={e => setProductionOpen(e.currentTarget.open)}><summary>Chỉnh sửa cấu hình Production dự kiến</summary><MiniAppProductionDraft appId={appId} version={view.selected} resetSignal={resetSignal} disabled={working || loading || publisherBusy || !!retryCommand || !focusReady}
            onBusy={setEditorBusy} onDirty={setEditorDirty} onChanged={() => void load()} /></details>}
          {view.selected.version.state === 'Draft' ? <ReviewChecklist readiness={view.readiness} busy={busy} onSubmit={() => {
            if (view.readiness?.readyForReview) setConfirmation({ requestId: crypto.randomUUID(), versionId: view.readiness.versionId, concurrencyToken: view.readiness.concurrencyToken, appVersion: view.readiness.appVersion });
          }} /> : <p>Phiên bản đã gửi không thể chỉnh sửa. Mọi thay đổi tiếp theo được lưu trong bản nháp mới.</p>}</>}
      </>}
      <div className="mini-actions"><Link className="button button-secondary" href={`/console/apps/${appId}/sandbox`}>Mở kiểm thử Sandbox</Link><button type="button" className="button button-secondary" disabled={working} onClick={() => onConfigure('websiteUrl')}>Mở cấu hình ứng dụng</button></div>
      {view.live && <details><summary>Nội dung phiên bản đang phát hành · #{view.live.version.versionCode}</summary><VersionSnapshot snapshot={view.live.snapshot} title="Cấu hình đang phát hành" /></details>}
      {view.selected && <MiniAppPublishing appId={appId} version={view.selected} active={view.publications.items.find(p => p.status === 'Published')} disabled={working || loading || editorBusy || editorDirty || !!retryCommand || !focusReady}
        onBusy={setPublisherBusy} onChanged={value => { setMessage(value); void load(); }} />}
      <section aria-label="Lịch sử xét duyệt"><h3>Lịch sử xét duyệt</h3>{!view.reviews.items.length ? <p>Chưa có yêu cầu xét duyệt.</p> : <ul className="review-history-list">{view.reviews.items.map(r => <li key={r.id}>
        <span>#{r.versionCode} · {reviewStatus[r.status]}<time>{reviewTime(r.submittedAt)}</time></span><button type="button" className="button button-secondary" disabled={working || historyLoading} onClick={() => void showReview(r.id)}>Xem kết quả phiên bản #{r.versionCode}</button></li>)}</ul>}
        <nav className="mini-actions" aria-label="Trang lịch sử xét duyệt"><button className="button button-secondary" disabled={busy || view.reviews.page <= 1} onClick={() => { page.current--; void load(); }}>Trước</button>
          <span>Trang {view.reviews.page}</span><button className="button button-secondary" disabled={busy || view.reviews.page * view.reviews.pageSize >= view.reviews.total} onClick={() => { page.current++; void load(); }}>Sau</button></nav>
        {historyLoading && <p role="status">Đang tải kết quả xét duyệt…</p>}
        {detail && <ReviewHistoryDetail detail={detail} onEdit={() => { if (draft) { selected.current = draft.id; void load(); } else document.getElementById('review-version-name')?.focus(); }} onField={field => {
          if (field.startsWith('production.')) { setProductionOpen(true); requestAnimationFrame(() => document.getElementById('production-draft-heading')?.focus()); } else onConfigure(field);
        }} />}
      </section>
    </>}
    {confirmation && <Dialog title="Gửi phiên bản này xét duyệt?" close={() => { if (!working) setConfirmation(null); }} busy={working}>
      <p>Phiên bản {view?.selected?.version.versionName} · #{view?.selected?.version.versionCode}. Thông tin và cấu hình của phiên bản này sẽ được khóa khi gửi.</p>
      <p>Quản trị viên xét duyệt trước khi bạn chọn phát hành. Bản đang phát hành tiếp tục được theo dõi riêng.</p><div className="mini-actions"><button className="button button-secondary" disabled={working} onClick={() => setConfirmation(null)}>Hủy</button>
        <button className="button" disabled={working} onClick={() => void run({ kind: 'submit', request: confirmation })}>{working ? 'Đang gửi…' : 'Xác nhận gửi xét duyệt'}</button></div>
    </Dialog>}
  </section>;
}
