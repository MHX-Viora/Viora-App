import { accountRequest, AccountApiError } from './account-client';
import type { SandboxReadiness } from './mini-app-sandbox';

export type Transport = (path: string, method?: string, body?: unknown) => Promise<unknown>;
export type Version = { id: string; versionCode: number; versionName: string; state: 'Draft' | 'Submitted' | 'Archived'; snapshotHash: string;
  concurrencyToken: string; createdAt: string; updatedAt: string; submittedAt: string | null };
export type Intent = { clientIdentity: string | null; clientId: string | null; clientType: 'Public' | 'Confidential'; scopes: string[]; redirectUris: string[]; sandboxEnabled: boolean };
export type Snapshot = { schemaVersion: 1; name: string; category: string; logoUrl: string | null; shortDescription: string | null; description: string | null;
  websiteUrl: string | null; domain: string | null; privacyPolicyUrl: string | null; termsOfServiceUrl: string | null; supportEmail: string | null;
  ssoEnabled: boolean; sandbox: Intent | null; production: Intent | null };
export type VersionDetail = { version: Version; snapshot: Snapshot };
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number };
export type Review = { id: string; versionId: string; versionCode: number; status: 'PendingReview' | 'InReview' | 'ChangesRequested' | 'Rejected' | 'Approved';
  submittedAt: string; reviewStartedAt: string | null; decidedAt: string | null; concurrencyToken: string };
export type ReviewReadiness = { versionId: string; snapshotHash: string; concurrencyToken: string; appVersion: string; readyForReview: boolean; evaluatedAt: string;
  sandboxRunId: string | null; configurationFingerprint: string | null; requiredChecks: SandboxReadiness['checks']; blockingReasons: string[]; warnings: string[] };
export type ReviewDetail = { review: Review; versionName: string; snapshotHash: string; snapshot: Snapshot;
  evidence: { schemaVersion: 1 | 2; versionId: string; snapshotHash: string; sandboxRunId: string; configurationFingerprint: string; evaluatedAt: string; checks: SandboxReadiness['checks'] };
  reason: string | null; changes: { field: string; message: string }[];
  actions: { action: string; actorType: string; beforeState: string | null; afterState: string | null; reason: string | null; createdAt: string }[] };
export type VersionCreate = { requestId: string; appVersion: string; versionName: string };
export type VersionUpdate = { requestId: string; concurrencyToken: string; versionName: string };
export type ReviewSubmit = { requestId: string; versionId: string; concurrencyToken: string; appVersion: string };
export function ensure(value: unknown): asserts value { if (!value) throw new Error('Dữ liệu xét duyệt không hợp lệ. Hãy tải lại và thử lại.'); }
export const guid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) && v !== '00000000-0000-0000-0000-000000000000';
export const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
export const date = (v: unknown): v is string => text(v, 40) && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
export const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const fingerprint = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);
export const nullable = (v: unknown, valid: (value: unknown) => boolean) => v === null || valid(v);
export function object(v: unknown, keys: string[]): Record<string, unknown> {
  ensure(v && typeof v === 'object' && !Array.isArray(v)); const row = v as Record<string, unknown>;
  ensure(Object.keys(row).length === keys.length && keys.every(key => Object.hasOwn(row, key))); return row;
}
export function strings(v: unknown, max: number, size: number): v is string[] { return Array.isArray(v) && v.length <= max && v.every(x => text(x, size)); }
export function pageQuery(page = 1, pageSize = 20) {
  ensure(Number.isInteger(page) && page >= 1 && page <= 100000 && Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100);
  return new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
}
export function appPath(appId: string) { ensure(/^app_[A-Za-z0-9_-]{43}$/.test(appId)); return `mini-apps/${appId}`; }
export function idPath(id: string) { ensure(guid(id)); return id; }
export function parsePage<T>(value: unknown, parse: (value: unknown) => T): Page<T> {
  const v = object(value, ['items', 'page', 'pageSize', 'total']); pageQuery(v.page as number, v.pageSize as number);
  ensure(Number.isSafeInteger(v.total) && (v.total as number) >= 0 && Array.isArray(v.items) && v.items.length <= (v.pageSize as number) && v.items.length <= (v.total as number));
  return { items: v.items.map(parse), page: v.page as number, pageSize: v.pageSize as number, total: v.total as number };
}
export function parseVersion(value: unknown): Version {
  const v = object(value, ['id', 'versionCode', 'versionName', 'state', 'snapshotHash', 'concurrencyToken', 'createdAt', 'updatedAt', 'submittedAt']);
  ensure(guid(v.id) && Number.isSafeInteger(v.versionCode) && (v.versionCode as number) > 0 && text(v.versionName, 80) && v.versionName.length > 0 &&
    ['Draft', 'Submitted', 'Archived'].includes(String(v.state)) && hash(v.snapshotHash) && guid(v.concurrencyToken) && date(v.createdAt) && date(v.updatedAt) && nullable(v.submittedAt, date));
  return v as unknown as Version;
}
export function https(value: unknown): value is string {
  if (!text(value, 2048)) return false;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.hash && !value.includes('*'); } catch { return false; }
}
function intent(value: unknown, production = false): Intent | null {
  if (value === null) return null;
  const v = object(value, ['clientIdentity', 'clientId', 'clientType', 'scopes', 'redirectUris', 'sandboxEnabled']);
  ensure(nullable(v.clientIdentity, guid) && nullable(v.clientId, x => text(x, 100)) && ['Public', 'Confidential'].includes(String(v.clientType)) &&
    strings(v.scopes, 3, 10) && v.scopes.every(x => ['openid', 'profile', 'email'].includes(x)) && new Set(v.scopes).size === v.scopes.length &&
    strings(v.redirectUris, 20, 2048) && v.redirectUris.every(https) && typeof v.sandboxEnabled === 'boolean' && (!production || !v.sandboxEnabled));
  return v as unknown as Intent;
}
export function parseSnapshot(value: unknown): Snapshot {
  const v = object(value, ['schemaVersion', 'name', 'category', 'logoUrl', 'shortDescription', 'description', 'websiteUrl', 'domain', 'privacyPolicyUrl', 'termsOfServiceUrl', 'supportEmail', 'ssoEnabled', 'sandbox', 'production']);
  ensure(v.schemaVersion === 1 && text(v.name, 120) && text(v.category, 80) && typeof v.ssoEnabled === 'boolean');
  for (const key of ['logoUrl', 'websiteUrl', 'privacyPolicyUrl', 'termsOfServiceUrl']) ensure(nullable(v[key], https));
  for (const [key, max] of [['shortDescription', 300], ['description', 10000], ['domain', 253], ['supportEmail', 254]] as const) ensure(nullable(v[key], x => text(x, max)));
  intent(v.sandbox); intent(v.production, true); return v as unknown as Snapshot;
}
export function parseVersionDetail(value: unknown): VersionDetail {
  const v = object(value, ['version', 'snapshot']); return { version: parseVersion(v.version), snapshot: parseSnapshot(v.snapshot) };
}
export function parseReview(value: unknown): Review {
  const v = object(value, ['id', 'versionId', 'versionCode', 'status', 'submittedAt', 'reviewStartedAt', 'decidedAt', 'concurrencyToken']);
  ensure(guid(v.id) && guid(v.versionId) && guid(v.concurrencyToken) && Number.isSafeInteger(v.versionCode) && (v.versionCode as number) > 0 &&
    ['PendingReview', 'InReview', 'ChangesRequested', 'Rejected', 'Approved'].includes(String(v.status)) && date(v.submittedAt) && nullable(v.reviewStartedAt, date) && nullable(v.decidedAt, date));
  return v as unknown as Review;
}
const checkKeys = ['logo', 'name', 'category', 'description', 'website', 'domain', 'supportEmail', 'callbacks', 'privacyPolicy', 'termsOfService', 'environment', 'ssoClient', 'discovery', 'runtime', 'bridge', 'consent', 'token', 'userInfo'];
function checks(value: unknown): SandboxReadiness['checks'] {
  ensure(Array.isArray(value) && value.length === 18 && new Set(value.map(x => x?.key)).size === 18);
  for (const row of value) {
    const v = object(row, ['key', 'applicable', 'status', 'messageCode', 'evidenceSource', 'evidenceAt']);
    ensure(checkKeys.includes(String(v.key)) && typeof v.applicable === 'boolean' && ['Passed', 'Failed', 'Warning', 'Skipped', 'NotImplemented'].includes(String(v.status)) &&
      text(v.messageCode, 100) && ['Server', 'HostReported', 'SdkReported', 'ServerProtocol', 'TrustedBrowser'].includes(String(v.evidenceSource)) && nullable(v.evidenceAt, date));
  }
  return value as SandboxReadiness['checks'];
}
export function parseReviewReadiness(value: unknown): ReviewReadiness {
  const v = object(value, ['versionId', 'snapshotHash', 'concurrencyToken', 'appVersion', 'readyForReview', 'evaluatedAt', 'sandboxRunId', 'configurationFingerprint', 'requiredChecks', 'blockingReasons', 'warnings']);
  ensure(guid(v.versionId) && hash(v.snapshotHash) && guid(v.concurrencyToken) && guid(v.appVersion) && typeof v.readyForReview === 'boolean' && date(v.evaluatedAt) &&
    nullable(v.sandboxRunId, guid) && nullable(v.configurationFingerprint, x => x === '' || fingerprint(x)) && strings(v.blockingReasons, 60, 150) && strings(v.warnings, 60, 150));
  checks(v.requiredChecks); return v as unknown as ReviewReadiness;
}
export function parseReviewDetail(value: unknown): ReviewDetail {
  const v = object(value, ['review', 'versionName', 'snapshotHash', 'snapshot', 'evidence', 'reason', 'changes', 'actions']);
  const review = parseReview(v.review); parseSnapshot(v.snapshot);
  const e = object(v.evidence, ['schemaVersion', 'versionId', 'snapshotHash', 'sandboxRunId', 'configurationFingerprint', 'evaluatedAt', 'checks']); checks(e.checks);
  ensure(text(v.versionName, 80) && hash(v.snapshotHash) && nullable(v.reason, x => text(x, 2000)) && [1, 2].includes(e.schemaVersion as number) && e.versionId === review.versionId &&
    e.snapshotHash === v.snapshotHash && guid(e.sandboxRunId) && fingerprint(e.configurationFingerprint) && date(e.evaluatedAt) && Array.isArray(v.changes) && v.changes.length <= 20 && Array.isArray(v.actions) && v.actions.length <= 100);
  const changeFields = ['name', 'category', 'logoUrl', 'shortDescription', 'description', 'websiteUrl', 'domain', 'privacyPolicyUrl', 'termsOfServiceUrl', 'supportEmail', 'ssoEnabled', 'sandbox.clientType', 'sandbox.scopes', 'sandbox.redirectUris', 'production.clientType', 'production.scopes', 'production.redirectUris'];
  for (const row of v.changes) { const item = object(row, ['field', 'message']); ensure(typeof item.field === 'string' && changeFields.includes(item.field) && text(item.message, 2000)); }
  for (const row of v.actions) { const item = object(row, ['action', 'actorType', 'beforeState', 'afterState', 'reason', 'createdAt']);
    ensure(text(item.action, 64) && ['Developer', 'Admin'].includes(String(item.actorType)) && nullable(item.beforeState, x => text(x, 32)) && nullable(item.afterState, x => text(x, 32)) && nullable(item.reason, x => text(x, 2000)) && date(item.createdAt)); }
  return v as unknown as ReviewDetail;
}
export class ReviewRequestSequence {
  private generation = 0;
  begin() { return ++this.generation; }
  invalidate() { this.generation++; }
  isCurrent(value: number) { return value === this.generation; }
}
export function reviewError(error: unknown) {
  const status = error instanceof AccountApiError ? error.status : -1;
  return status === 409 ? 'Dữ liệu đã thay đổi. Tải lại trạng thái trước khi tiếp tục.' : status === 401 ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' :
    status === 403 ? 'Phiên hiện tại không có quyền thực hiện thao tác này.' : status === 404 ? 'Chức năng chưa được bật hoặc không tìm thấy phiên bản thuộc ứng dụng này.' :
    'Chưa thể hoàn tất yêu cầu. Kiểm tra kết nối, thử lại cùng yêu cầu hoặc tải lại trạng thái.';
}
export function createReviewClient(send: Transport = accountRequest) {
  return {
    versions: async (app: string, page = 1, size = 20) => parsePage(await send(appPath(app) + '/versions?' + pageQuery(page, size)), parseVersion),
    version: async (app: string, id: string) => { const v = parseVersionDetail(await send(appPath(app) + '/versions/' + idPath(id))); ensure(v.version.id === id); return v; },
    createVersion: async (app: string, request: VersionCreate) => {
      const r = object(request, ['requestId', 'appVersion', 'versionName']); ensure(guid(r.requestId) && guid(r.appVersion) && text(r.versionName, 80) && r.versionName.trim().length > 0);
      const v = parseVersion(await send(appPath(app) + '/versions', 'POST', r)); ensure(v.state === 'Draft'); return v;
    },
    updateVersion: async (app: string, id: string, request: VersionUpdate) => {
      const r = object(request, ['requestId', 'concurrencyToken', 'versionName']);
      ensure(guid(r.requestId) && guid(r.concurrencyToken) && text(r.versionName, 80) && r.versionName.trim().length > 0);
      const v = parseVersion(await send(appPath(app) + '/versions/' + idPath(id), 'PUT', r)); ensure(v.id === id && v.state === 'Draft'); return v;
    },
    readiness: async (app: string) => parseReviewReadiness(await send(appPath(app) + '/review-readiness')),
    reviews: async (app: string, page = 1, size = 20) => parsePage(await send(appPath(app) + '/reviews?' + pageQuery(page, size)), parseReview),
    review: async (app: string, id: string) => { const v = parseReviewDetail(await send(appPath(app) + '/reviews/' + idPath(id))); ensure(v.review.id === id); return v; },
    submit: async (app: string, request: ReviewSubmit) => {
      const r = object(request, ['requestId', 'versionId', 'concurrencyToken', 'appVersion']); ensure(Object.values(r).every(guid));
      const v = parseReview(await send(appPath(app) + '/reviews', 'POST', r)); ensure(v.versionId === request.versionId && v.status === 'PendingReview'); return v;
    },

  };
}
export const reviewClient = createReviewClient();
