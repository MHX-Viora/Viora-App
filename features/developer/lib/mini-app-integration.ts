import { BASE_PATH } from './site';
import { AccountApiError, DEVELOPER_SESSION_EVENT } from './account-client';

export type IntegrationConfiguration = {
  websiteUrl: string; supportEmail: string; shortDescription: string; description: string;
  privacyPolicyUrl: string; termsOfServiceUrl: string;
};
export type DomainVerification = {
  hostname: string | null; status: 'Pending' | 'Verified' | 'Failed' | 'Expired' | 'Revoked'; fileName: string | null;
  verificationUrl: string | null; verifiedAt: string | null; lastCheckedAt: string | null; expiresAt: string | null;
  errorCode: string | null; message: string | null;
};
export type ConfigurationReadiness = {
  configurationReady: boolean; readyForSandbox: boolean; readyForReview: boolean; sandboxAvailable: boolean;
  reviewAvailable: boolean; checkedAt: string;
  checks: { key: string; requirement: 'required' | 'optional' | 'warning'; status: 'passed' | 'failed' | 'warning'; message: string }[];
};
export async function downloadVerificationFile(appId: string) {
  let response: Response;
  try { response = await fetch(`${BASE_PATH}/api/account/mini-apps/${appId}/domain-verification/file`, {
    credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { Accept: 'text/plain', 'X-ANKT-Developer': '1' },
  }); } catch { throw new Error('Không tải được file. Kiểm tra kết nối và thử lại.'); }
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new CustomEvent(DEVELOPER_SESSION_EVENT, { detail: { account: null } }));
    const error = await response.json(); throw new AccountApiError(error?.error?.message ?? 'Không tải được file xác minh.', response.status);
  }
  const fileName = response.headers.get('Content-Disposition')?.match(/filename="?(ankt-verify-[a-f0-9]{32}\.txt)"?(?:;|$)/i)?.[1];
  const file = await response.blob();
  if (!fileName || file.size > 4096 || file.type.split(';')[0] !== 'text/plain') throw new Error('File xác minh trả về không hợp lệ.');
  const url = URL.createObjectURL(file); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
