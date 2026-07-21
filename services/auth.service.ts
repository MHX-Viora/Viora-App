import {
  clearSession,
  getAccessToken,
  getSession,
  saveSession,
} from "@/stores/session-store";
import type {
  AccessTokenResponse,
  Credentials,
  LoginResponse,
  RegisterResponse,
} from "@/types/auth";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
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

  return { accessToken, user };
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
  await saveSession(session);
};

export const getStoredAuthSession = async () => {
  return getSession();
};

export const clearAuthSession = async (): Promise<void> => {
  await clearSession();
};

export const logout = async (): Promise<void> => {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/api/accounts/logout`, {
    method: "POST",
    headers: token
      ? { Accept: "application/json", Authorization: `Bearer ${token}` }
      : { Accept: "application/json" },
    credentials: "include",
  });

  if (!response.ok && response.status !== 204) {
    const text = await response.text();
    let data: unknown = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }

    const message = getErrorMessage(data as ApiError, "Đăng xuất thất bại.");

    throw new Error(message);
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
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
      credentials: "include",
    });
  } catch (error) {
    throw getAuthRequestError(error);
  }

  //  Parse JSON ngay tại đây.
  const data = await parseResponseText(response);

  //  API lỗi thì throw Error để màn hình login catch và show alert.
  if (!response.ok || (isRecord(data) && data.status === 0)) {
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

export const refreshToken = async (): Promise<AccessTokenResponse> => {
  //  Refresh token dùng cookie nên không cần gửi body.
  const response = await fetch(`${BASE_URL}/api/accounts/refresh-token`, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "include",
  });

  //  Backend trả accessToken mới.
  const data = await parseResponseText(response);

  //  Refresh fail thì để API cần token tự catch lỗi.
  if (!response.ok || (isRecord(data) && data.status === 0)) {
    const error = data as ApiError;
    const message = getErrorMessage(error, "Làm mới phiên thất bại.");

    throw new Error(message);
  }

  //  Chỉ cần accessToken mới là đủ.
  if (!isAccessTokenResponse(data)) {
    throw new Error("Phản hồi làm mới phiên không hợp lệ.");
  }

  return data;
};

