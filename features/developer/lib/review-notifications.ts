import { accountRequest } from './account-client';
import { appPath, date, ensure, guid, idPath, nullable, object, pageQuery, parsePage, type Page, type Transport } from './mini-app-review';

export type ReviewNotification = { id: string; eventType: 'ReviewSubmitted' | 'ReviewStarted' | 'ChangesRequested' | 'ReviewRejected' | 'ReviewApproved' | 'Published' | 'Unpublished' | 'Suspended' | 'Restored';
  appId: string; reviewId: string | null; versionId: string | null; publicationId: string | null; deepLink: string; createdAt: string; readAt: string | null };
export type NotificationPage = Page<ReviewNotification> & { unreadCount: number };
export function reviewFocus(search: string): { reviewId?: string; versionId?: string; publicationId?: string } | null {
  if (search.length > 300) return null;
  const query = new URLSearchParams(search);
  if (query.get('tab') !== 'review' || [...query.keys()].some(key => !['tab', 'reviewId', 'versionId', 'publicationId'].includes(key) || query.getAll(key).length !== 1 || key !== 'tab' && !guid(query.get(key)))) return null;
  if (query.has('publicationId') && !query.has('versionId')) return null;
  return { reviewId: query.get('reviewId') ?? undefined, versionId: query.get('versionId') ?? undefined, publicationId: query.get('publicationId') ?? undefined };
}
export function notificationLink(value: Pick<ReviewNotification, 'appId' | 'reviewId' | 'versionId' | 'publicationId'>) {
  appPath(value.appId); let link = '/developers/console/apps/' + value.appId + '?tab=review';
  if (value.reviewId) link += '&reviewId=' + idPath(value.reviewId);
  if (value.versionId) link += '&versionId=' + idPath(value.versionId);
  if (value.publicationId) link += '&publicationId=' + idPath(value.publicationId);
  return link;
}
export function parseReviewNotification(value: unknown): ReviewNotification {
  const v = object(value, ['id', 'eventType', 'appId', 'reviewId', 'versionId', 'publicationId', 'deepLink', 'createdAt', 'readAt']);
  ensure(guid(v.id) && ['ReviewSubmitted', 'ReviewStarted', 'ChangesRequested', 'ReviewRejected', 'ReviewApproved', 'Published', 'Unpublished', 'Suspended', 'Restored'].includes(String(v.eventType)) &&
    typeof v.appId === 'string' && nullable(v.reviewId, guid) && nullable(v.versionId, guid) && nullable(v.publicationId, guid) && date(v.createdAt) && nullable(v.readAt, date) &&
    (v.readAt === null || Date.parse(v.readAt as string) >= Date.parse(v.createdAt)));
  ensure(v.deepLink === notificationLink(v as unknown as ReviewNotification)); return v as unknown as ReviewNotification;
}
export function createNotificationClient(send: Transport = accountRequest) {
  return {
    list: async (page = 1, size = 20, unread = false): Promise<NotificationPage> => {
      ensure(typeof unread === 'boolean');
      const v = object(await send('review-notifications?' + pageQuery(page, size) + '&unread=' + unread), ['items', 'page', 'pageSize', 'total', 'unreadCount']);
      ensure(Number.isSafeInteger(v.unreadCount) && (v.unreadCount as number) >= 0);
      return { ...parsePage({ items: v.items, page: v.page, pageSize: v.pageSize, total: v.total }, parseReviewNotification), unreadCount: v.unreadCount as number };
    },
    read: async (id: string) => { const v = parseReviewNotification(await send('review-notifications/' + idPath(id) + '/read', 'POST', {})); ensure(v.id === id); return v; },
  };
}
export const notificationClient = createNotificationClient();
