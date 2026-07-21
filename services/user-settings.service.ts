import { authenticatedFetch } from "@/services/authenticated-fetch";
import type {
  UpdateUserSettingsInput,
  UserSettings,
  UserSettingsLanguage,
  UserSettingsTheme,
} from "@/types/user-settings";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseResponseText = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getApiErrorMessage = (data: unknown, fallback: string) => {
  if (typeof data === "string" && data.trim()) return data;
  if (isRecord(data) && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (isRecord(data) && typeof data.title === "string" && data.title.trim()) {
    return data.title;
  }
  return fallback;
};

const toBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const toLanguage = (value: unknown): UserSettingsLanguage =>
  value === "en" ? "en" : "vi";

const toTheme = (value: unknown): UserSettingsTheme =>
  value === "light" || value === "dark" ? value : "system";

const mapUserSettings = (data: unknown): UserSettings => {
  const payload = isRecord(data) ? data : {};

  return {
    allowComment: toBoolean(payload.allowComment),
    allowMention: toBoolean(payload.allowMention),
    allowMessageEveryone: toBoolean(payload.allowMessageEveryone),
    isPrivate: toBoolean(payload.isPrivate),
    language: toLanguage(payload.language),
    theme: toTheme(payload.theme),
  };
};

const mapUserSettingsPatch = (data: unknown): UpdateUserSettingsInput => {
  if (!isRecord(data)) return {};
  const patch: UpdateUserSettingsInput = {};

  if ("allowComment" in data) patch.allowComment = toBoolean(data.allowComment);
  if ("allowMention" in data) patch.allowMention = toBoolean(data.allowMention);
  if ("allowMessageEveryone" in data) {
    patch.allowMessageEveryone = toBoolean(data.allowMessageEveryone);
  }
  if ("isPrivate" in data) patch.isPrivate = toBoolean(data.isPrivate);
  if ("language" in data) patch.language = toLanguage(data.language);
  if ("theme" in data) patch.theme = toTheme(data.theme);

  return patch;
};

export const getUserSettings = async (): Promise<UserSettings> => {
  const response = await authenticatedFetch(`${BASE_URL}/api/user-settings`, {
    headers: { Accept: "application/json" },
  });
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể tải cài đặt tài khoản."));
  }

  return mapUserSettings(data);
};

export const updateUserSettings = async (
  input: UpdateUserSettingsInput,
): Promise<UpdateUserSettingsInput> => {
  const response = await authenticatedFetch(`${BASE_URL}/api/user-settings`, {
    body: JSON.stringify(input),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể cập nhật cài đặt."));
  }

  return mapUserSettingsPatch(data);
};
