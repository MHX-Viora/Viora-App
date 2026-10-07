import {
  InvalidRefreshTokenError,
  refreshToken,
} from "@/services/auth.service";
import { getJwtUserId, hasSessionIdentityMismatch, isJwtExpiringSoon } from "@/services/jwt-expiry";
import { createCrossTabTokenExchange } from "@/services/cross-tab-token-exchange";
import { createTokenRefreshCoordinator } from "@/services/token-refresh-coordinator";
import { Platform } from "react-native";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getSession,
  setAuthTokens,
} from "@/stores/session-store";

const runTokenRefreshExclusive = async <T>(operation: () => Promise<T>): Promise<T> => {
  if (typeof navigator === "undefined" || !navigator.locks) return operation();
  return navigator.locks.request("viora-auth-token-refresh", () => operation());
};

let crossTabExchange: ReturnType<typeof createCrossTabTokenExchange> | null | undefined;
const getCrossTabExchange = () => {
  if (crossTabExchange !== undefined) return crossTabExchange;
  if (Platform.OS !== "web" || typeof BroadcastChannel === "undefined") {
    crossTabExchange = null;
    return null;
  }
  try {
    crossTabExchange = createCrossTabTokenExchange(
      new BroadcastChannel("viora-auth-token-refresh"),
      getSession,
      (session) => Boolean(session.user?.id && getJwtUserId(session.accessToken)?.toLowerCase() === session.user.id.toLowerCase()) && !isJwtExpiringSoon(session.accessToken),
      300,
      getRefreshToken,
    );
  } catch {
    crossTabExchange = null;
  }
  return crossTabExchange;
};

const getCurrentOrSharedToken = async (rejectedToken: string): Promise<string | null> => {
  const currentToken = await getAccessToken();
  if (!currentToken || currentToken !== rejectedToken) return currentToken;

  const session = await getSession();
  const sharedTokens = session && !hasSessionIdentityMismatch(session)
    ? await getCrossTabExchange()?.request(session, rejectedToken)
    : null;
  if (!session || !sharedTokens) return currentToken;

  const latestSession = await getSession();
  if (!latestSession || latestSession.sessionId !== session.sessionId ||
    latestSession.user?.id !== session.user?.id) return getAccessToken();
  if (latestSession.accessToken !== rejectedToken) return latestSession.accessToken;
  await setAuthTokens(sharedTokens);
  return sharedTokens.accessToken;
};

const coordinateTokenRefresh = createTokenRefreshCoordinator(
  async () => {
    const refreshedSession = await refreshToken();
    await setAuthTokens(refreshedSession);
    return refreshedSession.accessToken;
  },
  getCurrentOrSharedToken,
  runTokenRefreshExclusive,
);
const refreshRejectedToken = async (token: string): Promise<string> => {
  try {
    return await coordinateTokenRefresh(token);
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) {
      const currentToken = await getCurrentOrSharedToken(token);
      if (currentToken && currentToken !== token) return currentToken;
      await clearSession();
    }
    throw error;
  }
};
export const refreshRejectedAccessToken = refreshRejectedToken;

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
  if (!session?.accessToken || (!isJwtExpiringSoon(session.accessToken) && !hasSessionIdentityMismatch(session))) {
    return session;
  }

  try {
    await refreshRejectedToken(session.accessToken);
    const refreshedSession = await getSession();
    if (refreshedSession && hasSessionIdentityMismatch(refreshedSession)) {
      await clearSession();
      return null;
    }
    return refreshedSession;
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) return null;
    if (hasSessionIdentityMismatch(session)) throw error;
    return session;
  }
};

export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = (await ensureFreshSession())?.accessToken ?? null;

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
