// Deterministic UI samples, not acceptance evidence for real authentication, review or SSO.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MiniAppDetail } from '../components/mini-app-detail';
import { MiniAppsProvider } from '../components/mini-apps';
import { ReviewNotifications } from '../components/review-notifications';
import '../developer.css';
import '../mini-app.css';
import '../components/mini-app-sandbox.css';
import '../components/mini-app-review.css';

const appId = 'app_' + 'u'.repeat(43), now = '2026-10-21T00:00:00Z';
const id = n => '11111111-1111-4111-8111-' + String(n).padStart(12, '0');
const scenario = location.hash.slice(1); let tick = 10, appVersion = id(++tick);
const stats = window.__reviewFixture = { loadId: crypto.randomUUID(), submitCalls: 0, submitRequestIds: [], publishCalls: 0, unpublishCalls: 0, markCalls: 0, retiredLoginCalls: 0 };
const snapshot = { schemaVersion: 1, name: 'Ứng dụng đối tác mẫu', category: 'utilities', logoUrl: 'https://partner.example.com/logo.png', shortDescription: 'Bộ công cụ phục vụ công việc mỗi ngày.',
  description: 'Phiên bản có thông tin pháp lý và cấu hình được lưu riêng để xét duyệt.', websiteUrl: 'https://partner.example.com', domain: 'partner.example.com', privacyPolicyUrl: 'https://partner.example.com/privacy',
  termsOfServiceUrl: 'https://partner.example.com/terms', supportEmail: 'support@example.test', ssoEnabled: false, sandbox: null, production: null };
const version = (code = 1) => ({ id: id(++tick), versionCode: code, versionName: code + '.0', state: 'Draft', snapshotHash: 'a'.repeat(64), concurrencyToken: id(++tick), createdAt: now, updatedAt: now, submittedAt: null });
let versions = [{ version: version(), snapshot: structuredClone(snapshot) }], reviews = [], publications = [], receipts = [];
const keys = ['logo', 'name', 'category', 'description', 'website', 'domain', 'supportEmail', 'callbacks', 'privacyPolicy', 'termsOfService', 'environment', 'ssoClient', 'discovery', 'runtime', 'bridge', 'consent', 'token', 'userInfo'];
const checks = keys.map(key => { const applicable = !['callbacks', 'ssoClient', 'discovery', 'consent'].includes(key);
  return { key, applicable, status: applicable ? 'Passed' : 'Skipped', messageCode: applicable ? 'CHECK_PASSED' : 'CHECK_NOT_APPLICABLE',
    evidenceSource: ['runtime', 'bridge', 'token', 'userInfo'].includes(key) ? 'ServerProtocol' : 'Server', evidenceAt: applicable ? now : null }; });
function notify(eventType, reviewId = null, versionId = versions[0].version.id, publicationId = null) {
  receipts.unshift({ id: id(++tick), eventType, appId, reviewId, versionId, publicationId,
    deepLink: `/developers/console/apps/${appId}?tab=review${reviewId ? '&reviewId=' + reviewId : ''}${versionId ? '&versionId=' + versionId : ''}${publicationId ? '&publicationId=' + publicationId : ''}`, createdAt: now, readAt: null });
}
function review(status = 'PendingReview') {
  const v = versions[0]; v.version.state = 'Submitted'; v.version.submittedAt = now; v.version.concurrencyToken = id(++tick);
  const row = { id: id(++tick), versionId: v.version.id, versionCode: v.version.versionCode, status, submittedAt: now, reviewStartedAt: status === 'PendingReview' ? null : now,
    decidedAt: ['Approved', 'Rejected', 'ChangesRequested'].includes(status) ? now : null, concurrencyToken: id(++tick) };
  reviews.unshift(row); notify(status === 'Approved' ? 'ReviewApproved' : status === 'ChangesRequested' ? 'ChangesRequested' : 'ReviewSubmitted', row.id); return row;
}
if (scenario === 'approved' || scenario === 'changes') review(scenario === 'approved' ? 'Approved' : 'ChangesRequested');
if (new URLSearchParams(location.search).has('reviewId') && !reviews.length) review();
const journal = new Map();
function paginate(rows, url) { const page = Number(url.searchParams.get('page') ?? 1), pageSize = Number(url.searchParams.get('pageSize') ?? 20); return { items: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: rows.length }; }
window.fetch = async (input, init) => {
  const url = new URL(String(input), location.origin), path = url.pathname.replace('/developers/api/account/', ''), method = init?.method ?? 'GET';
  const body = init?.body ? JSON.parse(init.body) : {};
  if (body.requestId && journal.has(body.requestId)) { if (path.endsWith('/reviews')) { stats.submitCalls++; stats.submitRequestIds.push(body.requestId); } return Response.json(journal.get(body.requestId)); }
  if (path === 'review-notifications') { const visible = url.searchParams.get('unread') === 'true' ? receipts.filter(r => !r.readAt) : receipts; return Response.json({ ...paginate(visible, url), unreadCount: receipts.filter(r => !r.readAt).length }); }
  if (path.startsWith('review-notifications/') && method === 'POST') { const receipt = receipts.find(r => path.includes(r.id)); receipt.readAt ??= now; stats.markCalls++; return Response.json(receipt); }
  if (path.endsWith('/activity')) return Response.json([]);
  if (path.endsWith('/versions') && method === 'POST') { const row = { version: version(versions.length + 1), snapshot: structuredClone(snapshot) }; row.version.versionName = body.versionName; versions.unshift(row); appVersion = id(++tick); journal.set(body.requestId, row.version); return Response.json(row.version); }
  if (path.endsWith('/versions')) return Response.json(paginate(versions.map(r => r.version), url));
  if (path.includes('/versions/')) {
    const row = versions.find(r => path.includes(r.version.id));
    if (!row) return Response.json({}, { status: 404 });
    if (method === 'PUT') { row.version.versionName = body.versionName;
      row.version.concurrencyToken = id(++tick); row.version.snapshotHash = 'b'.repeat(64); appVersion = id(++tick); journal.set(body.requestId, row.version); return Response.json(row.version); }
    return Response.json(row);
  }
  if (path.endsWith('/review-readiness')) { const v = versions.find(r => r.version.state === 'Draft'); const blocked = false;
    return Response.json({ versionId: v.version.id, snapshotHash: v.version.snapshotHash, concurrencyToken: v.version.concurrencyToken, appVersion, readyForReview: !blocked,
      evaluatedAt: now, sandboxRunId: id(600), configurationFingerprint: 'A'.repeat(64), requiredChecks: checks, blockingReasons: blocked ? ['CONFIGURATION_REQUIRED'] : [], warnings: [] }); }
  if (path.endsWith('/reviews') && method === 'POST') { stats.submitCalls++; stats.submitRequestIds.push(body.requestId); const row = review(); journal.set(body.requestId, row);
    await new Promise(resolve => setTimeout(resolve, 700)); if (scenario === 'retry' && stats.submitCalls === 1) throw new TypeError('Simulated lost reply'); return Response.json(row); }
  if (path.endsWith('/reviews')) return Response.json(paginate(reviews, url));
  if (path.includes('/reviews/')) { const r = reviews.find(r => path.endsWith(r.id)), v = versions.find(v => v.version.id === r.versionId);
    return Response.json({ review: r, versionName: v.version.versionName, snapshotHash: v.version.snapshotHash, snapshot: v.snapshot,
      evidence: { schemaVersion: 2, versionId: v.version.id, snapshotHash: v.version.snapshotHash, sandboxRunId: id(600), configurationFingerprint: 'A'.repeat(64), evaluatedAt: now, checks },
      reason: r.status === 'ChangesRequested' ? '<script>escaped</script> Bổ sung trang hỗ trợ công khai.' : null, changes: r.status === 'ChangesRequested' ? [{ field: 'websiteUrl', message: 'Cập nhật trang giới thiệu ứng dụng.' }] : [], actions: [] }); }
  if (path.endsWith('/publications')) return Response.json(paginate(publications, url));
  if (path.endsWith('/publication-readiness')) { const versionId = url.searchParams.get('versionId'), approved = reviews.find(r => r.versionId === versionId && r.status === 'Approved'), active = publications.find(r => r.status === 'Published');
    const blockers = !approved ? ['TARGET_NOT_APPROVED'] : active?.versionId === versionId ? ['TARGET_ALREADY_PUBLISHED'] : [];
    return Response.json({ versionId, snapshotHash: versions.find(v => v.version.id === versionId).version.snapshotHash, approvedReviewRequestId: approved?.id ?? null, appVersion,
      publicationId: active?.id ?? null, publicationRevision: active?.concurrencyToken ?? null, operationalRevision: publications.length ? id(800) : null, canPublish: !blockers.length, canUnpublish: !!active, evaluatedAt: now, blockingReasons: blockers }); }
  if (path.endsWith('/publish')) { stats.publishCalls++; const v = versions.find(v => v.version.id === body.versionId), r = reviews.find(r => r.versionId === body.versionId && r.status === 'Approved');
    if (!r) return Response.json({}, { status: 409 });
    for (const old of publications.filter(p => p.status === 'Published')) { old.status = 'Archived'; old.unpublishedAt = now; }
    const publication = { id: id(++tick), versionId: v.version.id, versionCode: v.version.versionCode, approvedReviewRequestId: r.id, status: 'Published', publishedAt: now, unpublishedAt: null, concurrencyToken: id(++tick) };
    publications.unshift(publication); appVersion = id(++tick); notify('Published', r.id, v.version.id, publication.id); const result = { publication, appVersion, operationalRevision: id(800) }; journal.set(body.requestId, result); return Response.json(result); }
  if (path.endsWith('/unpublish')) { stats.unpublishCalls++; const publication = publications.find(p => p.id === body.publicationId); publication.status = 'UnpublishedByOwner'; publication.unpublishedAt = now; publication.concurrencyToken = id(++tick); appVersion = id(++tick);
    const result = { publication, appVersion, operationalRevision: id(800) }; journal.set(body.requestId, result); notify('Unpublished', publication.approvedReviewRequestId, publication.versionId, publication.id); return Response.json(result); }
  if (path === `mini-apps/${appId}`) return Response.json({ appId, appVersion, ...snapshot, logoUrl: null, status: publications.some(p => p.status === 'Published') ? 'Published' : 'Draft', createdAt: now, updatedAt: now });
  return Response.json({ error: { message: 'UI fixture route unavailable' } }, { status: 404 });
};
function Fixture() { const [inbox, setInbox] = useState(false); return <div className="developer-site"><main className="container" style={{ paddingBlock: 24 }}>
  <p className="notice">Chỉ kiểm thử giao diện · dữ liệu mô phỏng · không phải E2E nghiệp vụ.</p><button className="button button-secondary" onClick={() => setInbox(!inbox)}>{inbox ? 'Về ứng dụng mẫu' : 'Mở inbox mẫu'}</button>
  <MiniAppsProvider>{inbox ? <ReviewNotifications /> : <MiniAppDetail appId={appId} />}</MiniAppsProvider></main></div>; }
createRoot(document.getElementById('root')).render(<Fixture />);
