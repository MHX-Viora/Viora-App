import { useEffect, useRef, useState } from 'react';
import { AccountApiError } from '../lib/account-client';
import { publishingClient, type Publication, type PublicationReadiness, type PublishRequest, type UnpublishRequest } from '../lib/mini-app-publishing';
import { ReviewRequestSequence, reviewError, type VersionDetail } from '../lib/mini-app-review';
import { blockerText, reviewStatus } from './review-history';
import { Dialog } from './mini-apps';

type Command = { kind: 'publish'; request: PublishRequest } | { kind: 'unpublish'; request: UnpublishRequest };
export function MiniAppPublishing({ appId, version, active, disabled, onBusy, onChanged }: {
  appId: string; version: VersionDetail; active: Publication | undefined; disabled: boolean; onBusy: (value: boolean) => void; onChanged: (message: string) => void;
}) {
  const [ready, setReady] = useState<PublicationReadiness | null>(null), [loading, setLoading] = useState(true), [working, setWorking] = useState(false);
  const [error, setError] = useState(''), [confirmation, setConfirmation] = useState<Command | null>(null), [retry, setRetry] = useState<Command | null>(null);
  const sequence = useRef(new ReviewRequestSequence()), running = useRef(false), live = useRef(true);
  useEffect(() => {
    live.current = true; const reads = sequence.current; const current = reads.begin(); setReady(null); setLoading(true); setError('');
    publishingClient.readiness(appId, version.version.id).then(value => { if (reads.isCurrent(current)) {
      if (value.snapshotHash !== version.version.snapshotHash) throw new Error('Publication snapshot changed'); setReady(value);
    } })
      .catch(e => { if (reads.isCurrent(current)) setError(reviewError(e)); }).finally(() => { if (reads.isCurrent(current)) setLoading(false); });
    return () => { live.current = false; reads.invalidate(); };
  }, [appId, version.version.id, version.version.concurrencyToken, version.version.snapshotHash]);
  useEffect(() => { onBusy(working); return () => onBusy(false); }, [working, onBusy]);
  async function run(command: Command) {
    if (running.current) return; running.current = true; setWorking(true); setError(''); setRetry(command);
    try {
      if (command.kind === 'publish') await publishingClient.publish(appId, command.request); else await publishingClient.unpublish(appId, command.request);
      if (live.current) { setConfirmation(null); setRetry(null); onChanged(command.kind === 'publish' ? 'Đã ghi nhận phát hành đúng phiên bản đã duyệt. Trạng thái hiện tại đã được tải lại.' : 'Đã ghi nhận ngừng phát hành phiên bản đã chọn. Trạng thái hiện tại đã được tải lại.'); }
    } catch (e) {
      if (live.current) { setConfirmation(null); setError(reviewError(e)); if (e instanceof AccountApiError && e.status >= 400 && e.status < 500) { setRetry(null); setReady(null); } }
    } finally { running.current = false; if (live.current) setWorking(false); }
  }
  const busy = disabled || working || loading || !!retry;
  const canUnpublish = !!ready?.canUnpublish && !!active && ready.publicationId === active.id && ready.publicationRevision === active.concurrencyToken && !!ready.operationalRevision;
  return <section aria-labelledby="publication-heading" aria-busy={loading || working}><h3 id="publication-heading">Phát hành Production</h3>
    <p>Đích đang xem: {version.version.versionName} · #{version.version.versionCode}. Quyền phát hành được kiểm tra theo đúng phiên bản đã duyệt.</p>
    {loading && <p role="status">Đang kiểm tra điều kiện phát hành…</p>}{error && <p role="alert" className="notice">{error}</p>}
    {ready && <><p role="status">{ready.canPublish ? 'Máy chủ xác nhận đủ điều kiện phát hành phiên bản này.' : 'Phiên bản này chưa thể phát hành mới.'}</p>
      {!!ready.blockingReasons.length && <ul>{ready.blockingReasons.map(code => <li key={code}>{blockerText(code)}</li>)}</ul>}
      <div className="mini-actions"><button type="button" className="button" disabled={busy || !ready.canPublish} onClick={() => setConfirmation({ kind: 'publish', request: {
        requestId: crypto.randomUUID(), concurrencyToken: ready.appVersion, versionId: ready.versionId, publicationId: ready.publicationId,
        publicationRevision: ready.publicationRevision, operationalRevision: ready.operationalRevision,
      } })}>Phát hành phiên bản #{version.version.versionCode}</button>
        {active && <button type="button" className="button button-secondary" disabled={busy || !canUnpublish} onClick={() => {
          if (canUnpublish) setConfirmation({ kind: 'unpublish', request: { requestId: crypto.randomUUID(), concurrencyToken: ready.appVersion,
            publicationId: active.id, publicationRevision: active.concurrencyToken, operationalRevision: ready.operationalRevision!, reason: null } });
        }}>Ngừng phát hành phiên bản #{active.versionCode}</button>}</div>
    </>}
    {retry && !working && <button className="button" type="button" disabled={disabled} onClick={() => void run(retry)}>Thử lại cùng yêu cầu phát hành</button>}
    {active && <p className="muted">Phiên bản đang phát hành: #{active.versionCode} · {reviewStatus[active.status]}.</p>}
    {confirmation && <Dialog title={confirmation.kind === 'publish' ? 'Phát hành phiên bản đã duyệt?' : 'Ngừng phát hành Production?'} busy={working} close={() => setConfirmation(null)}>
      <p>{confirmation.kind === 'publish' ? `Phát hành phiên bản ${version.version.versionName} · #${version.version.versionCode}. Publication cũ sẽ được lưu vào lịch sử khi thay phiên bản.` :
        `Ngừng phát hành phiên bản #${active?.versionCode}. Quyền đăng nhập Production hiện có của ứng dụng sẽ bị thu hồi.`}</p>
      <div className="mini-actions"><button className="button button-secondary" disabled={working} onClick={() => setConfirmation(null)}>Hủy</button><button className="button" disabled={working} onClick={() => void run(confirmation)}>{working ? 'Đang xử lý…' : 'Xác nhận'}</button></div>
    </Dialog>}
  </section>;
}
