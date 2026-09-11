import {
  InvalidRefreshTokenError,
  refreshToken,
} from "@/services/auth.service";
import { isJwtExpiringSoon } from "@/services/jwt-expiry";
import { createTokenRefreshCoordinator } from "@/services/token-refresh-coordinator";
import {
  clearSession,
  getAccessToken,
  getSession,
  setAuthTokens,
} from "@/stores/session-store";

const coordinateTokenRefresh = createTokenRefreshCoordinator(
  async () => {
    try {
      const refreshedSession = await refreshToken();
      await setAuthTokens(refreshedSession);
      return refreshedSession.accessToken;
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        await clearSession();
      }
      throw error;
    }
  },
  getAccessToken,
);
const refreshRejectedToken = (token: string) => coordinateTokenRefresh(token);

export const getRealtimeAccessToken = async (): Promise<string> => {
  const token = await getAccessToken();
  if (!token) return "";
  if (!isJwtExpiringSoon(token)) return token;

  try {
    return await refreshRejectedToken(token);
  } catch (error) {
    return error instanceof InvalidRefreshTokenError ? "" : token;
  }
};

export const ensureFreshSession = async () => {
  const session = await getSession();
  if (!session?.accessToken || !isJwtExpiringSoon(session.accessToken)) {
    return session;
  }

  try {
    await refreshRejectedToken(session.accessToken);
    return getSession();
  } catch (error) {
    return error instanceof InvalidRefreshTokenError ? null : session;
  }
};

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
  const refreshedToken = await refreshRejectedToken(token);

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
