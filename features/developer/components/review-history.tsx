import type { ReviewDetail, ReviewReadiness, Snapshot } from '../lib/mini-app-review';
import { SandboxChecksView } from './sandbox-results';

export const reviewStatus: Record<string, string> = { PendingReview: 'Đang chờ xét duyệt', InReview: 'Đang được xét duyệt', ChangesRequested: 'Cần chỉnh sửa', Rejected: 'Đã từ chối', Approved: 'Đã duyệt', Draft: 'Bản nháp', Submitted: 'Đã gửi duyệt', Archived: 'Đã lưu trữ', Published: 'Đang phát hành', UnpublishedByOwner: 'Đã ngừng phát hành', Suspended: 'Đã đình chỉ' };
export const reviewTime = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có';
const fields: Record<string, string> = { name: 'Tên ứng dụng', category: 'Danh mục', logoUrl: 'Logo', shortDescription: 'Mô tả ngắn', description: 'Mô tả', websiteUrl: 'Website', domain: 'Domain', privacyPolicyUrl: 'Chính sách riêng tư', termsOfServiceUrl: 'Điều khoản', supportEmail: 'Email hỗ trợ', ssoEnabled: 'Đăng nhập ANKT' };
const blockerLabels: Record<string, string> = { DOMAIN_UNVERIFIED: 'Xác minh lại domain của phiên bản.', METADATA_INCOMPLETE: 'Bổ sung thông tin ứng dụng, pháp lý và hỗ trợ.',
  APP_SUSPENDED: 'Ứng dụng đang bị đình chỉ. Liên hệ quản trị viên.', PRODUCTION_CANDIDATE_REQUIRED: 'Lưu cấu hình Production dự kiến trong bản nháp.',
  PRODUCTION_CREDENTIAL_REQUIRED: 'Chuẩn bị credential Confidential cho bản nháp.', VERSION_WORKING_CHANGED: 'Bản nháp cần được cập nhật theo cấu hình hiện tại.',
  REVIEW_ALREADY_ACTIVE: 'Đã có phiên bản đang chờ hoặc đang được xét duyệt.', SANDBOX_FRESH_SOURCE_REQUIRED: 'Chạy lại kiểm thử Sandbox bằng phiên Developer hiện tại.',
  BRIDGE_FRESH_SOURCE_REQUIRED: 'Mở Sandbox và hoàn tất đăng nhập Auth Bridge bằng phiên Developer hiện tại, sau đó quay lại kiểm tra trạng thái trong vòng 5 phút.',
  TARGET_NOT_APPROVED: 'Phiên bản này chưa được duyệt.', TARGET_ALREADY_PUBLISHED: 'Phiên bản này đang được phát hành.', TARGET_PUBLIC_PAGE_UNAVAILABLE: 'Kiểm tra website và các trang pháp lý công khai.' };
export function blockerText(code: string) { return blockerLabels[code] ?? (code.startsWith('SANDBOX_') ? 'Hoàn tất mục kiểm tra Sandbox tương ứng và kiểm tra lại.' : 'Kiểm tra lại điều kiện của phiên bản hoặc liên hệ hỗ trợ.'); }
export function ReviewChecklist({ readiness, busy = false, onSubmit }: { readiness: ReviewReadiness | null; busy?: boolean; onSubmit: () => void }) {
  if (!readiness) return <p role="status">Chưa có đánh giá gửi duyệt. Chọn bản nháp và kiểm tra lại.</p>;
  return <section aria-label="Điều kiện gửi xét duyệt"><p role="status">{readiness.readyForReview ? 'Máy chủ xác nhận bản nháp đủ điều kiện gửi duyệt.' : 'Bản nháp chưa đủ điều kiện gửi duyệt.'}</p>
    <p className="muted">Kiểm tra lúc {reviewTime(readiness.evaluatedAt)}. Kết quả sẽ được kiểm tra lại khi gửi.</p>
    {readiness.requiredChecks.some(check => check.key === 'bridge' && check.evidenceSource === 'ServerProtocol') &&
      <p>Bằng chứng Auth Bridge do máy chủ xác minh qua trao đổi mã đăng nhập và kiểm tra hồ sơ. Hãy tự kiểm tra giao diện và chức năng Mini App trong Sandbox trước khi gửi.</p>}
    {!!readiness.blockingReasons.length && <ul className="review-blockers">{readiness.blockingReasons.map(code => <li key={code}>{blockerText(code)}</li>)}</ul>}
    <details><summary>Xem {readiness.requiredChecks.filter(check=>check.applicable).length} mục kiểm tra và nguồn bằng chứng</summary><SandboxChecksView checks={readiness.requiredChecks} /></details>
    <button type="button" className="button" disabled={busy || !readiness.readyForReview} onClick={onSubmit}>Gửi phiên bản xét duyệt</button>
  </section>;
}
export function VersionSnapshot({ snapshot, title }: { snapshot: Snapshot; title: string }) {
  return <section className="review-snapshot"><h3>{title}</h3><dl className="mini-facts">
    {(['name', 'category', 'shortDescription', 'description', 'websiteUrl', 'domain', 'privacyPolicyUrl', 'termsOfServiceUrl', 'supportEmail'] as const).map(key =>
      <div key={key}><dt>{fields[key]}</dt><dd>{snapshot[key] || 'Chưa có'}</dd></div>)}
  </dl></section>;
}
export function ReviewHistoryDetail({ detail, onEdit, onField }: { detail: ReviewDetail; onEdit: () => void; onField?: (field: string) => void }) {
  const editable = detail.review.status === 'ChangesRequested' || detail.review.status === 'Rejected';
  return <article className="review-decision"><h3>Phiên bản {detail.versionName} · #{detail.review.versionCode}</h3>
    <p><strong>{reviewStatus[detail.review.status]}</strong></p>{detail.reason && <p className="review-reason">{detail.reason}</p>}
    {!!detail.changes.length && <ul>{detail.changes.map((item, index) => <li key={index}><strong>{fields[item.field] ?? 'Cấu hình ứng dụng'}</strong>: {item.message}
      {onField && <button type="button" className="button button-secondary" onClick={() => onField(item.field)}>Mở mục cần sửa</button>}</li>)}</ul>}
    {editable && <><p>Chỉnh sửa cấu hình ứng dụng và tạo bản nháp mới để gửi lại. Phiên bản đã gửi được giữ nguyên trong lịch sử.</p><button type="button" className="button button-secondary" onClick={onEdit}>Tạo bản nháp mới</button></>}
    <details><summary>Thông tin phiên bản đã gửi</summary><VersionSnapshot snapshot={detail.snapshot} title="Bản đã gửi duyệt" /></details>
    <details><summary>Bằng chứng lưu khi gửi · {reviewTime(detail.evidence.evaluatedAt)}</summary><SandboxChecksView checks={detail.evidence.checks} /></details>
    {!!detail.actions.length && <details><summary>Lịch sử xử lý</summary><ol className="review-timeline">{detail.actions.map((action, index) => <li key={index}>
      <strong>{reviewStatus[action.afterState ?? ''] ?? 'Cập nhật phiên bản'}</strong> · {action.actorType === 'Admin' ? 'Quản trị viên' : action.actorType === 'Developer' ? 'Developer' : 'Hệ thống'}
      <time>{reviewTime(action.createdAt)}</time>{action.reason && <p>{action.reason}</p>}</li>)}</ol></details>}
  </article>;
}
