import { authenticatedFetch } from "@/services/authenticated-fetch";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const JSON_HEADERS = {
  Accept: "application/json, text/plain",
  "Content-Type": "application/json",
};

type ApiError = {
  errors?: unknown;
  message?: unknown;
  title?: unknown;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseResponseText = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!isRecord(error)) return fallback;

  const apiError = error as ApiError;
  if (typeof apiError.message === "string" && apiError.message.trim()) {
    return apiError.message;
  }

  if (isRecord(apiError.errors)) {
    for (const value of Object.values(apiError.errors)) {
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value)) {
        const firstError = value.find((item) => typeof item === "string");
        if (typeof firstError === "string" && firstError.trim()) {
          return firstError;
        }
      }
    }
  }

  if (typeof apiError.title === "string" && apiError.title.trim()) {
    return apiError.title;
  }

  return fallback;
};

export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<string> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/account/change-password`,
    {
      body: JSON.stringify(payload),
      headers: JSON_HEADERS,
      method: "PUT",
    },
  );
  const data = await parseResponseText(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Đổi mật khẩu thất bại."));
  }

  return getErrorMessage(data, "Đổi mật khẩu thành công.");
};
