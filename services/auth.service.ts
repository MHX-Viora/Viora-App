import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getSession,
  saveSession,
  setRefreshToken,
} from "@/stores/session-store";
import type {
  AccessTokenResponse,
  Credentials,
  ForgotPasswordMessage,
  ForgotPasswordStatus,
  LoginResponse,
  RegisterResponse,
} from "@/types/auth";
import { clearGoogleAuthSession } from "@/services/google-auth.service";
import { refreshTokenTransportHeaders } from "@/services/refresh-token-transport";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

const AUTH_JSON_HEADERS = {
  ...JSON_HEADERS,
  ...refreshTokenTransportHeaders,
};

const getAuthRequestError = (error: unknown) => {
  if (error instanceof TypeError) {
    return new Error("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
  }
  return error;
};

type ApiError = {
  message?: unknown;
  title?: unknown;
  status?: unknown;
  errors?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const normalizeUser = (value: unknown): LoginResponse["user"] | undefined => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;

  const id = asString(value.id ?? value.userId);
  if (!id) return undefined;

  return {
    accountId: asString(value.accountId),
    avatarUrl: asString(value.avatarUrl ?? value.avatar),
    coverUrl: asString(value.coverUrl ?? value.cover),
    displayName: asString(value.displayName ?? value.name ?? value.fullName, "Người dùng"),
    id,
    isVerified: asBoolean(value.isVerified),
    role: asNumber(value.role),
    verificationStatus: asNumber(value.verificationStatus),
    accountStyle: asNumber(value.accountStyle),
  };
};

const isRegisterResponse = (value: unknown): value is RegisterResponse => {
  return isRecord(value) && typeof value.message === "string";
};

const normalizeLoginResponse = (value: unknown): LoginResponse | null => {
  if (!isRecord(value)) return null;

  const payload = isRecord(value.data)
    ? value.data
    : isRecord(value.result)
      ? value.result
      : value;
  const accessToken = asString(
    payload.accessToken ?? payload.token ?? payload.jwt,
  );
  if (!accessToken) return null;

  const user = "user" in payload
    ? normalizeUser(payload.user)
    : "profile" in payload
      ? normalizeUser(payload.profile)
      : null;
  if (user === undefined) return null;

  return {
    accessToken,
    refreshToken: asString(payload.refreshToken) || undefined,
    accessTokenExpiresAt: asString(payload.accessTokenExpiresAt) || undefined,
    refreshTokenExpiresAt: asString(payload.refreshTokenExpiresAt) || undefined,
    sessionId: asString(payload.sessionId) || undefined,
    user,
  };
};

const isAccessTokenResponse = (
  value: unknown,
): value is AccessTokenResponse => {
  return isRecord(value) && typeof value.accessToken === "string";
};

const parseResponseText = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const translateAuthErrorMessage = (message: string, fallback: string) => {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("password") &&
    (normalizedMessage.includes("wrong") ||
      normalizedMessage.includes("incorrect") ||
      normalizedMessage.includes("invalid"))
  ) {
    return "Mật khẩu không chính xác.";
  }

  if (
    normalizedMessage.includes("user not found") ||
    normalizedMessage.includes("account not found") ||
    normalizedMessage.includes("not exist") ||
    normalizedMessage.includes("not found")
  ) {
    return "Tài khoản không tồn tại.";
  }

  if (
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("already exist") ||
    normalizedMessage.includes("duplicate") ||
    normalizedMessage.includes("taken")
  ) {
    return "Tài khoản đã tồn tại.";
  }

  if (
    normalizedMessage.includes("invalid") &&
    (normalizedMessage.includes("credential") ||
      normalizedMessage.includes("login") ||
      normalizedMessage.includes("identifier"))
  ) {
    return "Thông tin đăng nhập không chính xác.";
  }

  if (normalizedMessage.includes("email")) {
    return "Email không hợp lệ.";
  }

  if (normalizedMessage.includes("phone")) {
    return "Số điện thoại không hợp lệ.";
  }

  return message.trim() || fallback;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  let message = fallback;
  if (!isRecord(error)) return translateAuthErrorMessage(message, fallback);

  if (typeof error.message === "string" && error.message.trim()) {
    message = error.message;
  } else if (isRecord(error.errors)) {
    for (const value of Object.values(error.errors)) {
      if (typeof value === "string" && value.trim()) {
        message = value;
        break;
      }
      if (Array.isArray(value)) {
        const firstError = value.find((item) => typeof item === "string");
        if (typeof firstError === "string" && firstError.trim()) {
          message = firstError;
          break;
        }
      }
    }
  } else if (typeof error.title === "string" && error.title.trim()) {
    message = error.title;
  }

  return translateAuthErrorMessage(message, fallback);
};

export const saveAuthSession = async (
  session: LoginResponse,
): Promise<void> => {
  if (session.refreshToken) {
    await setRefreshToken(session.refreshToken);
  }
  const { refreshToken: _refreshToken, ...storedSession } = session;
  await saveSession(storedSession);
};

export const getStoredAuthSession = async () => {
  return getSession();
};

export const clearAuthSession = async (): Promise<void> => {
  await clearSession();
};

export const logout = async (): Promise<void> => {
  try {
    const token = await getAccessToken();
    const storedRefreshToken = await getRefreshToken();
    const response = await fetch(`${BASE_URL}/api/accounts/logout`, {
      method: "POST",
      headers: token
        ? { ...AUTH_JSON_HEADERS, Authorization: `Bearer ${token}` }
        : AUTH_JSON_HEADERS,
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
      credentials: "include",
    });

    if (!response.ok && response.status !== 204) {
      const data = await parseResponseText(response);
      const message = getErrorMessage(data as ApiError, "Đăng xuất thất bại.");
      throw new Error(message);
    }
  } finally {
    // Luôn xoá cả danh tính provider và phiên local, kể cả khi API không truy cập được.
    try {
      await clearGoogleAuthSession();
    } finally {
      await clearSession();
    }
  }
};

export const register = async (
  payload: Credentials,
): Promise<RegisterResponse> => {
  //  Gọi API đăng ký.
  const response = await fetch(`${BASE_URL}/api/accounts/register`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
    credentials: "include",
  });

  //  Parse JSON ngay trong function để nhìn flow không bị nhảy file.
  const data = await parseResponseText(response);

  // Nếu API báo lỗi, lấy message dễ hiểu nhất rồi throw.
  if (!response.ok || (isRecord(data) && data.status === 0)) {
    const error = data as ApiError;
    const message = getErrorMessage(error, "Đăng ký thất bại.");

    throw new Error(message);
  }

  //  Check response tối thiểu để tránh app dùng nhầm dữ liệu sai shape.
  if (!isRegisterResponse(data)) {
    throw new Error("Phản hồi đăng ký không hợp lệ.");
  }

  //  Thành công thì return đúng data API trả về.
  return data;
};

export const login = async (payload: Credentials): Promise<LoginResponse> => {
  if (!BASE_URL) {
    throw new Error("Thiếu cấu hình API đăng nhập.");
  }

  //  Gọi API đăng nhập.
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/accounts/login`, {
      method: "POST",
      headers: AUTH_JSON_HEADERS,
      body: JSON.stringify(payload),
      credentials: "include",
    });
  } catch (error) {
    throw getAuthRequestError(error);
  }

  //  Parse JSON ngay tại đây.
  const data = await parseResponseText(response);

  // `status` trong response là trạng thái tài khoản, không phải cờ thành công.
  // Chỉ HTTP status quyết định request đăng nhập có thất bại hay không.
  if (!response.ok) {
    const error = data as ApiError;
    const message = getErrorMessage(error, "Đăng nhập thất bại.");

    throw new Error(message);
  }

  //  Login phải trả accessToken; user có thể null nếu chưa hoàn thiện hồ sơ.
  const session = normalizeLoginResponse(data);
  if (!session) {
    throw new Error("Phản hồi đăng nhập không hợp lệ.");
  }

  return session;
};

export const googleLogin = async (
  firebaseToken: string,
): Promise<LoginResponse> => {
  if (!BASE_URL) {
    throw new Error("Thiếu cấu hình API đăng nhập.");
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/accounts/google-login`, {
      method: "POST",
      headers: AUTH_JSON_HEADERS,
      body: JSON.stringify({ firebaseToken }),
      credentials: "include",
    });
  } catch (error) {
    throw getAuthRequestError(error);
  }

  const data = await parseResponseText(response);
  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiError, "Đăng nhập Google thất bại."),
    );
  }

  const session = normalizeLoginResponse(data);
  if (!session) {
    throw new Error("Phản hồi đăng nhập Google không hợp lệ.");
  }
  return session;
};

export class InvalidRefreshTokenError extends Error {}

export const refreshToken = async (): Promise<AccessTokenResponse> => {
  const storedRefreshToken = await getRefreshToken();
  const response = await fetch(`${BASE_URL}/api/accounts/refresh-token`, {
    method: "POST",
    headers: AUTH_JSON_HEADERS,
    body: JSON.stringify({ refreshToken: storedRefreshToken }),
    credentials: "include",
  });

  //  Backend trả accessToken mới.
  const data = await parseResponseText(response);

  //  Refresh fail thì để API cần token tự catch lỗi.
  if (!response.ok || (isRecord(data) && data.status === 0)) {
    const error = data as ApiError;
    const message = getErrorMessage(error, "Làm mới phiên thất bại.");

    if (response.status === 401 || response.status === 403) {
      throw new InvalidRefreshTokenError(message);
    }
    throw new Error(message);
  }

  //  Chỉ cần accessToken mới là đủ.
  if (!isAccessTokenResponse(data)) {
    throw new Error("Phản hồi làm mới phiên không hợp lệ.");
  }

  return data;
};

const requestForgotPassword = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  if (!BASE_URL) {
    throw new Error("Thiếu cấu hình API.");
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: init?.body ? JSON_HEADERS : { Accept: "application/json" },
    });
  } catch (error) {
    throw getAuthRequestError(error);
  }

  const data = await parseResponseText(response);
  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiError, "Không thể xử lý yêu cầu quên mật khẩu."),
    );
  }

  return data as T;
};

export const getForgotPasswordStatus = (
  identifier: string,
): Promise<ForgotPasswordStatus> =>
  requestForgotPassword(
    `/api/auth/forgot-password/status?identifier=${encodeURIComponent(identifier)}`,
  );

export const setForgotPasswordPhone = (payload: {
  userId: string;
  phoneNumber: string;
  firebaseToken: string;
}): Promise<ForgotPasswordMessage> =>
  requestForgotPassword("/api/auth/phone-number", {
    body: JSON.stringify(payload),
    method: "PUT",
  });

export const resetForgottenPassword = (payload: {
  firebaseToken: string;
  identifier: string;
  newPassword: string;
}): Promise<ForgotPasswordMessage> =>
  requestForgotPassword("/api/auth/reset-password", {
    body: JSON.stringify(payload),
    method: "POST",
  });

