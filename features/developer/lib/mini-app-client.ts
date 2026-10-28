import { BASE_PATH } from './site';
import { AccountApiError, DEVELOPER_SESSION_EVENT } from './account-client';

export const categories = [
  ['utilities', 'Tiện ích'], ['shopping', 'Mua sắm'], ['education', 'Giáo dục'],
  ['services', 'Dịch vụ'], ['entertainment', 'Giải trí'], ['other', 'Khác'],
] as const;
export type MiniApp = {
  appId: string; name: string; category: string; logoUrl: string | null; status: string;
  shortDescription: string | null; description: string | null; websiteUrl: string | null;
  privacyPolicyUrl: string | null; termsOfServiceUrl: string | null; supportEmail: string | null;
  createdAt: string; updatedAt: string;
};
export type Logo = { uploadId: string; url: string };
export const statusLabel = (status: string) => ({ Draft: 'Bản nháp', ConfigurationIncomplete: 'Chưa đủ cấu hình', PendingReview: 'Chờ xét duyệt', ChangesRequested: 'Cần chỉnh sửa', Rejected: 'Đã từ chối', Approved: 'Đã duyệt', Published: 'Đang phát hành', Suspended: 'Đã đình chỉ' }[status] ?? status);
export async function uploadLogo(file: File): Promise<Logo> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2097152 || !file.size)
    throw new Error('Chọn ảnh PNG, JPG hoặc WebP, tối đa 2 MB.');
  let response: Response;
  try {
    response = await fetch(`${BASE_PATH}/api/account/mini-apps/logo`, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': file.type, 'X-ANKT-Developer': '1' }, body: file, signal: AbortSignal.timeout(60000),
    });
  } catch { throw new Error('Không tải được logo. Kiểm tra kết nối và thử lại.'); }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new CustomEvent(DEVELOPER_SESSION_EVENT, { detail: { account: null } }));
    throw new AccountApiError(data?.error?.message ?? 'Không thể tải logo.', response.status);
  }
  return data as Logo;
}
