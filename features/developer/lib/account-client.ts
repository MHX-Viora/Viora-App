import { BASE_PATH } from "./site";
import { isDeveloperAccount } from "./developer-types";

export const DEVELOPER_SESSION_EVENT = "ankt:developer-session";
function updateSession(account: unknown) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DEVELOPER_SESSION_EVENT, { detail: { account } }));
}

export class AccountApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
export async function accountRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(`${BASE_PATH}/api/account/${path}`, {
    method, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", "X-ANKT-Developer": "1" },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(/^mini-apps\/app_[A-Za-z0-9_-]{43}\/(?:sandbox\/readiness|review-readiness|publication-readiness\?versionId=[0-9a-f-]{36}|reviews|publish)$/.test(path) ? 45000 : 20000),
  }); } catch { throw new AccountApiError("Không thể kết nối. Kiểm tra mạng và thử lại.", 0); }
  let data;
  try { data = response.status === 204 ? null : await response.json(); }
  catch { throw new AccountApiError("Dịch vụ trả dữ liệu không hợp lệ. Vui lòng thử lại.", response.status); }
  if (!response.ok) {
    if (response.status === 401 && path !== "auth/me") updateSession(null);
    throw new AccountApiError(data?.error?.message ?? "Yêu cầu thất bại. Vui lòng thử lại.", response.status,
      typeof data?.error?.code === 'string' ? data.error.code : undefined);
  }
  if (["auth/logout", "auth/logout-all", "auth/change-password", "auth/reset-password"].includes(path)) updateSession(null);
  else if ((path === "auth/login" || (path === "profile" && method === "PATCH")) && isDeveloperAccount(data)) updateSession(data);
  return data as T;
}
