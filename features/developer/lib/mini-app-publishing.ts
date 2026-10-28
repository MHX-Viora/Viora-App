import { accountRequest } from './account-client';
import { appPath, date, ensure, guid, hash, idPath, nullable, object, pageQuery, parsePage, strings, text, type Transport } from './mini-app-review';

export type Publication = { id: string; versionId: string; versionCode: number; approvedReviewRequestId: string; status: 'Published' | 'UnpublishedByOwner' | 'Archived' | 'Suspended';
  publishedAt: string; unpublishedAt: string | null; concurrencyToken: string };
export type PublicationReadiness = { versionId: string; snapshotHash: string; approvedReviewRequestId: string | null; appVersion: string;
  publicationId: string | null; publicationRevision: string | null; operationalRevision: string | null;
  canPublish: boolean; canUnpublish: boolean; evaluatedAt: string; blockingReasons: string[] };
export type PublishRequest = { requestId: string; concurrencyToken: string; versionId: string; publicationId: string | null; publicationRevision: string | null; operationalRevision: string | null };
export type UnpublishRequest = { requestId: string; concurrencyToken: string; publicationId: string; publicationRevision: string; operationalRevision: string; reason: string | null };
export type PublishResult = { publication: Publication; appVersion: string; operationalRevision: string };
export function parsePublication(value: unknown): Publication {
  const v = object(value, ['id', 'versionId', 'versionCode', 'approvedReviewRequestId', 'status', 'publishedAt', 'unpublishedAt', 'concurrencyToken']);
  ensure(guid(v.id) && guid(v.versionId) && guid(v.approvedReviewRequestId) && guid(v.concurrencyToken) && Number.isSafeInteger(v.versionCode) && (v.versionCode as number) > 0 &&
    ['Published', 'UnpublishedByOwner', 'Archived', 'Suspended'].includes(String(v.status)) && date(v.publishedAt) && nullable(v.unpublishedAt, date) &&
    (v.status === 'Published' ? v.unpublishedAt === null : v.unpublishedAt !== null && Date.parse(v.unpublishedAt as string) >= Date.parse(v.publishedAt)));
  return v as unknown as Publication;
}
export function parsePublicationReadiness(value: unknown): PublicationReadiness {
  const v = object(value, ['versionId', 'snapshotHash', 'approvedReviewRequestId', 'appVersion', 'publicationId', 'publicationRevision', 'operationalRevision', 'canPublish', 'canUnpublish', 'evaluatedAt', 'blockingReasons']);
  ensure(guid(v.versionId) && hash(v.snapshotHash) && nullable(v.approvedReviewRequestId, guid) && guid(v.appVersion) && nullable(v.publicationId, guid) &&
    nullable(v.publicationRevision, guid) && nullable(v.operationalRevision, guid) && (v.publicationId === null) === (v.publicationRevision === null) &&
    typeof v.canPublish === 'boolean' && typeof v.canUnpublish === 'boolean' && date(v.evaluatedAt) && strings(v.blockingReasons, 60, 150) &&
    (!v.canPublish || v.approvedReviewRequestId !== null && v.blockingReasons.length === 0) && (!v.canUnpublish || v.publicationId !== null));
  return v as unknown as PublicationReadiness;
}
function result(value: unknown): PublishResult {
  const v = object(value, ['publication', 'appVersion', 'operationalRevision']); ensure(guid(v.appVersion) && guid(v.operationalRevision));
  return { publication: parsePublication(v.publication), appVersion: v.appVersion, operationalRevision: v.operationalRevision };
}
export function createPublishingClient(send: Transport = accountRequest) {
  return {
    readiness: async (app: string, versionId: string) => {
      const value = parsePublicationReadiness(await send(appPath(app) + '/publication-readiness?versionId=' + idPath(versionId)));
      ensure(value.versionId === versionId); return value;
    },
    publications: async (app: string, page = 1, size = 20) => parsePage(await send(appPath(app) + '/publications?' + pageQuery(page, size)), parsePublication),
    publish: async (app: string, request: PublishRequest) => {
      const r = object(request, ['requestId', 'concurrencyToken', 'versionId', 'publicationId', 'publicationRevision', 'operationalRevision']);
      ensure(guid(r.requestId) && guid(r.concurrencyToken) && guid(r.versionId) && nullable(r.publicationId, guid) && nullable(r.publicationRevision, guid) &&
        nullable(r.operationalRevision, guid) && (r.publicationId === null) === (r.publicationRevision === null));
      const value = result(await send(appPath(app) + '/publish', 'POST', r)); ensure(value.publication.versionId === request.versionId && value.publication.status === 'Published'); return value;
    },
    unpublish: async (app: string, request: UnpublishRequest) => {
      const r = object(request, ['requestId', 'concurrencyToken', 'publicationId', 'publicationRevision', 'operationalRevision', 'reason']);
      ensure(guid(r.requestId) && guid(r.concurrencyToken) && guid(r.publicationId) && guid(r.publicationRevision) && guid(r.operationalRevision) && nullable(r.reason, v => text(v, 2000)));
      const value = result(await send(appPath(app) + '/unpublish', 'POST', r)); ensure(value.publication.id === request.publicationId && value.publication.status === 'UnpublishedByOwner'); return value;
    },
  };
}
export const publishingClient = createPublishingClient();
