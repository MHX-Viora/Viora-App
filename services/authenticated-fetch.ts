import { refreshToken } from "@/services/auth.service";
import { createTokenRefreshCoordinator } from "@/services/token-refresh-coordinator";
import { getAccessToken, setAccessToken } from "@/stores/session-store";

const coordinateTokenRefresh = createTokenRefreshCoordinator(
  async () => {
    const refreshedSession = await refreshToken();
    await setAccessToken(refreshedSession.accessToken);
    void import("@/services/realtime.service").then(({ restartRealtime }) =>
      restartRealtime(),
    );

    return refreshedSession.accessToken;
  },
  getAccessToken,
);

export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = await getAccessToken();

  //  Gọi API lần đầu. Nếu có token thì gắn Authorization.
  let response = await fetch(url, {
    ...options,
    headers: token
      ? {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        }
      : options.headers,
    credentials: "include",
  });

  // Nếu API không trả 401 thì trả response cho service tự xử lý tiếp.
  if (response.status !== 401 || !token) {
    return response;
  }

  // 401 Unauthorized: Token hết hạn: refresh token, lưu token mới, rồi gọi lại đúng 1 lần.
  const refreshedToken = await coordinateTokenRefresh(token);

  response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${refreshedToken}`,
    },
    credentials: "include",
  });

  return response;
};
