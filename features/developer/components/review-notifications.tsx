import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '../navigation.web';
import { notificationClient, type NotificationPage } from '../lib/review-notifications';
import { ReviewRequestSequence, reviewError } from '../lib/mini-app-review';
import { reviewTime } from './review-history';
import { ConsolePageHeader } from './console-ui';

const labels: Record<string, string> = { ReviewSubmitted: 'Đã gửi phiên bản xét duyệt', ReviewStarted: 'Quản trị viên bắt đầu xét duyệt', ChangesRequested: 'Phiên bản cần chỉnh sửa',
  ReviewRejected: 'Phiên bản đã bị từ chối', ReviewApproved: 'Phiên bản đã được duyệt', Published: 'Đã phát hành phiên bản', Unpublished: 'Đã ngừng phát hành', Suspended: 'Ứng dụng bị đình chỉ', Restored: 'Ứng dụng đã được khôi phục' };
export function ReviewNotifications() {
  const [page, setPage] = useState(1), [unread, setUnread] = useState(false), [data, setData] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(true), [working, setWorking] = useState(false), [error, setError] = useState('');
  const reads = useRef(new ReviewRequestSequence()), writes = useRef(new ReviewRequestSequence()), running = useRef(false);
  const load = useCallback(async () => {
    const current = reads.current.begin(); setLoading(true); setError(''); setData(null);
    try { const value = await notificationClient.list(page, 20, unread); if (reads.current.isCurrent(current)) setData(value); }
    catch (e) { if (reads.current.isCurrent(current)) setError(reviewError(e)); }
    finally { if (reads.current.isCurrent(current)) setLoading(false); }
  }, [page, unread]);
  useEffect(() => { const requests = reads.current, commands = writes.current; void load(); return () => { requests.invalidate(); commands.invalidate(); }; }, [load]);
  async function read(id: string) {
    if (running.current) return; running.current = true; const current = writes.current.begin(); setWorking(true); setError('');
    try { await notificationClient.read(id); if (writes.current.isCurrent(current)) await load(); }
    catch (e) { if (writes.current.isCurrent(current)) setError(reviewError(e)); }
    finally { running.current = false; if (writes.current.isCurrent(current)) setWorking(false); }
  }
  return <section className="review-workspace" aria-labelledby="review-inbox-heading"><ConsolePageHeader id="review-inbox-heading" title="Thông báo xét duyệt" description="Kết quả xét duyệt, phát hành và trạng thái vận hành của các Mini App thuộc tài khoản Developer." action={<button type="button" className="button button-secondary" disabled={working || loading} onClick={() => void load()}>Tải lại thông báo</button>} />
    <label><input type="checkbox" checked={unread} disabled={working || loading} onChange={e => { setPage(1); setUnread(e.target.checked); }} /> Chỉ xem chưa đọc</label>
    {error && <p role="alert" className="notice">{error}</p>}{loading && <div className="mini-skeletons" role="status" aria-label="Đang tải thông báo"><div className="mini-skeleton" /></div>}
    {data && <><p role="status">{data.unreadCount} thông báo chưa đọc</p>{data.items.length ? <ul className="review-history-list">{data.items.map(item => <li key={item.id}>
      <div><strong>{labels[item.eventType]}</strong><p>{item.readAt ? 'Đã đọc' : 'Chưa đọc'} · {item.appId}</p><time>{reviewTime(item.createdAt)}</time>
        <Link className="button button-secondary" href={item.deepLink}>Mở phiên bản và kết quả</Link></div>
      {!item.readAt && <button className="button button-secondary" disabled={working} onClick={() => void read(item.id)}>{working ? 'Đang xử lý…' : 'Đánh dấu đã đọc'}</button>}</li>)}</ul> : <p>Chưa có thông báo phù hợp.</p>}
      <nav className="mini-actions" aria-label="Trang thông báo"><button className="button button-secondary" disabled={working || page <= 1} onClick={() => setPage(n => n - 1)}>Trước</button><span>Trang {data.page}</span>
        <button className="button button-secondary" disabled={working || data.page * data.pageSize >= data.total} onClick={() => setPage(n => n + 1)}>Sau</button></nav></>}
  </section>;
}
