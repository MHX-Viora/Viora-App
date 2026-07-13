import { refreshToken } from "@/services/auth.service";
import { sessionStore } from "@/stores/session-store";

const sendWithToken = async (
  url: string,
  accessToken: string,
  init: RequestInit,
): Promise<Response> => {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
  return response;
};

export const fetchWithRefresh = async (
  url: string,
  accessToken: string,
  init: RequestInit,
): Promise<Response> => {
  const response = await sendWithToken(url, accessToken, init);
  if (response.status !== 401) return response;

  // Token hết hạn: lấy token mới từ refresh cookie, lưu lại rồi retry đúng một lần.
  const refreshedSession = await refreshToken();
  await sessionStore.updateAccessToken(refreshedSession.accessToken);

  return sendWithToken(url, refreshedSession.accessToken, init);
};
