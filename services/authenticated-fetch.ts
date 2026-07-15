import { refreshToken } from "@/services/auth.service";
import { getAccessToken, setAccessToken } from "@/stores/session-store";

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
  const refreshedSession = await refreshToken();
  await setAccessToken(refreshedSession.accessToken);

  response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${refreshedSession.accessToken}`,
    },
    credentials: "include",
  });

  return response;
};
