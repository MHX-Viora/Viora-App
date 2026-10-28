import { accountRequest } from './account-client';

export type SandboxSession = {
  id: string; appId: string; environment: 'Sandbox'; createdAt: string; expiresAt: string;
  revokedAt: string | null; lastActivityAt: string; configurationFingerprint: string;
};
export type SandboxLaunch = { grant: string; expiresAt: string };
export type SandboxCheckKey = 'logo' | 'name' | 'category' | 'description' | 'website' | 'domain' | 'supportEmail' | 'callbacks'
  | 'privacyPolicy' | 'termsOfService' | 'environment' | 'ssoClient' | 'discovery' | 'runtime' | 'bridge' | 'consent' | 'token' | 'userInfo';
export type SandboxRunSummary = { id: string; sessionId: string; environment: 'Sandbox'; configurationFingerprint: string;
  status: 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Cancelled'; summaryCode: string; createdAt: string; deadlineAt: string;
  startedAt: string | null; completedAt: string | null };
export type SandboxRunDetail = {run: SandboxRunSummary; results: {key: SandboxCheckKey; status: 'Passed' | 'Failed' | 'Warning' | 'Skipped' | 'NotImplemented';
  messageCode: string; evidenceSource: string; evidenceAt: string | null; durationMs: number}[]};
export type SandboxReadiness = {environment: 'Sandbox'; configurationFingerprint: string; configurationReady: boolean;
  readyForSandbox: boolean; readyForReview: boolean; evaluatedAt: string;
  checks: {key: SandboxCheckKey; applicable: boolean; status: 'Passed' | 'Failed' | 'Warning' | 'Skipped' | 'NotImplemented';
    messageCode: string; evidenceSource: string; evidenceAt: string | null}[]; blockingIssues: SandboxCheckKey[]; warnings: SandboxCheckKey[]};
export type SandboxDiagnosticCategory = 'Runtime' | 'SSO' | 'Bridge' | 'Configuration' | 'Network' | 'Permission';
export type SandboxDiagnosticsPage = {
  items: { id: string; sessionId: string; testRunId: string | null; level: 'Info' | 'Warning' | 'Error'; category: SandboxDiagnosticCategory;
    code: string; evidenceSource: 'Server' | 'HostReported' | 'SdkReported' | 'ServerProtocol' | 'TrustedBrowser'; createdAt: string; count: number | null }[];
  nextCursor: string | null; droppedCount: number;
};
const appPattern = /^app_[A-Za-z0-9_-]{43}$/;
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function base(appId: string, sessionId?: string) {
  if (!appPattern.test(appId) || (sessionId !== undefined && !sessionPattern.test(sessionId))) throw new Error('Định danh Sandbox không hợp lệ.');
  return `mini-apps/${appId}/sandbox${sessionId ? '/sessions/' + sessionId : ''}`;
}
function runPath(appId: string, runId?: string) {
  if (runId !== undefined && !sessionPattern.test(runId)) throw new Error('Định danh lượt kiểm tra không hợp lệ.');
  return base(appId) + '/test-runs' + (runId ? '/' + runId : '');
}
export const sandboxClient = {
  readiness: (appId: string) => accountRequest<SandboxReadiness>(base(appId) + '/readiness'),
  config: (appId: string) => accountRequest<{hostOrigin: string}>(base(appId) + '/config'),
  create: (appId: string) => accountRequest<SandboxSession>(base(appId) + '/sessions', 'POST'),
  get: (appId: string, id: string) => accountRequest<SandboxSession>(base(appId, id)),
  revoke: (appId: string, id: string) => accountRequest<void>(base(appId, id), 'DELETE'),
  createRun: (appId: string, sessionId: string, checks?: SandboxCheckKey[]) => {
    base(appId, sessionId);
    return accountRequest<SandboxRunSummary>(runPath(appId), 'POST', {sessionId, checks});
  },
  run: (appId: string, runId: string) => accountRequest<SandboxRunDetail>(runPath(appId, runId)),
  cancelRun: (appId: string, runId: string) => accountRequest<void>(runPath(appId, runId), 'DELETE'),
  runs: (appId: string, sessionId: string, options: {cursor?: string; limit?: number; order?: 'newest'} = {}) => {
    base(appId, sessionId);
    const query = new URLSearchParams({sessionId});
    if (options.order !== undefined) query.set('order', options.order);
    if (options.cursor !== undefined) query.set('cursor', options.cursor);
    if (options.limit !== undefined) query.set('limit', String(options.limit));
    return accountRequest<{items: SandboxRunSummary[]; nextCursor: string | null}>(runPath(appId) + '?' + query);
  },
  diagnostics: (appId: string, id: string, options: {category?: SandboxDiagnosticCategory; cursor?: string; limit?: number} = {}) => {
    base(appId, id);
    const query = new URLSearchParams({sessionId: id});
    if (options.category !== undefined) query.set('category', options.category);
    if (options.cursor !== undefined) query.set('cursor', options.cursor);
    if (options.limit !== undefined) query.set('limit', String(options.limit));
    return accountRequest<SandboxDiagnosticsPage>(base(appId) + '/diagnostics?' + query);
  },
  launch: (appId: string, id: string, browserNonce: string) => {
    if (!/^[A-Za-z0-9_-]{43}$/.test(browserNonce)) throw new Error('Không xác nhận được trình duyệt Sandbox.');
    return accountRequest<SandboxLaunch>(base(appId, id) + '/launch-grants', 'POST', {browserNonce});
  },
};
