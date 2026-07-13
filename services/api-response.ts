import type { User } from "@/types/auth";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isUser = (value: unknown): value is User =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.accountId === "string" &&
  typeof value.displayName === "string" &&
  typeof value.avatarUrl === "string" &&
  typeof value.coverUrl === "string" &&
  typeof value.role === "number" &&
  typeof value.isVerified === "boolean" &&
  typeof value.verificationStatus === "number";

const getValidationMessage = (errors: unknown) => {
  if (!isRecord(errors)) return undefined;

  for (const value of Object.values(errors)) {
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value)) {
      const message = value.find((item): item is string => typeof item === "string");
      if (message) return message;
    }
  }
  return undefined;
};

const isFailedResponse = (data: unknown) =>
  isRecord(data) && data.status === 0;

const getApiErrorMessage = (data: unknown, fallback: string) => {
  if (!isRecord(data)) return fallback;
  if (typeof data.message === "string" && data.message.trim()) return data.message;

  const validationMessage = getValidationMessage(data.errors);
  if (validationMessage) return validationMessage;

  if (typeof data.title === "string" && data.title.trim()) return data.title;
  return fallback;
};

export const readApiResponse = async (
  response: Response,
  fallbackMessage: string,
): Promise<unknown> => {
  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");
  }

  if (!response.ok || isFailedResponse(data)) {
    throw new Error(getApiErrorMessage(data, fallbackMessage));
  }

  return data;
};
