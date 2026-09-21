import type { LoginResponse } from "../types/auth";

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
    gender: value.gender === 1 || value.gender === 2 ? value.gender : 0,
    id,
    isVerified: asBoolean(value.isVerified),
    role: asNumber(value.role),
    verificationStatus: asNumber(value.verificationStatus),
    accountStyle: asNumber(value.accountStyle),
  };
};

export const normalizeLoginResponse = (value: unknown): LoginResponse | null => {
  if (!isRecord(value)) return null;

  const payload = isRecord(value.data)
    ? value.data
    : isRecord(value.result)
      ? value.result
      : value;
  const accessToken = asString(payload.accessToken ?? payload.token ?? payload.jwt);
  if (!accessToken) return null;

  const user = "user" in payload
    ? normalizeUser(payload.user)
    : "profile" in payload
      ? normalizeUser(payload.profile)
      : null;
  if (user === undefined) return null;

  return { accessToken, user };
};
