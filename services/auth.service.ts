import {
  isRecord,
  isUser,
  readApiResponse,
} from "@/services/api-response";
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

const isRegisterResponse = (value: unknown): value is RegisterResponse =>
  isRecord(value) && typeof value.message === "string";

const isLoginResponse = (value: unknown): value is LoginResponse =>
  isRecord(value) &&
  typeof value.accessToken === "string" &&
  (value.user === null || isUser(value.user));

const isAccessTokenResponse = (value: unknown): value is AccessTokenResponse =>
  isRecord(value) && typeof value.accessToken === "string";

export const register = async (
  payload: Credentials,
): Promise<RegisterResponse> => {
  const response = await fetch(`${BASE_URL}/api/accounts/register`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const data = await readApiResponse(response, "Đăng ký thất bại.");

  if (!isRegisterResponse(data)) {
    throw new Error("Phản hồi đăng ký không hợp lệ.");
  }
  return data;
};

export const login = async (payload: Credentials): Promise<LoginResponse> => {
  const response = await fetch(`${BASE_URL}/api/accounts/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const data = await readApiResponse(response, "Đăng nhập thất bại.");

  if (!isLoginResponse(data)) {
    throw new Error("Phản hồi đăng nhập không hợp lệ.");
  }
  return data;
};

export const refreshToken = async (): Promise<AccessTokenResponse> => {
  const response = await fetch(`${BASE_URL}/api/accounts/refresh-token`, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "include",
  });
  const data = await readApiResponse(response, "Làm mới phiên thất bại.");

  if (!isAccessTokenResponse(data)) {
    throw new Error("Phản hồi làm mới phiên không hợp lệ.");
  }
  return data;
};
