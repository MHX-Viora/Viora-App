import type { Gender, User } from "../types/auth";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseUserResponse = (value: unknown): User | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" || !value.id ||
    typeof value.accountId !== "string" || !value.accountId ||
    typeof value.displayName !== "string" ||
    (value.gender !== 0 && value.gender !== 1 && value.gender !== 2) ||
    typeof value.role !== "number" || !Number.isFinite(value.role) ||
    typeof value.isVerified !== "boolean" ||
    typeof value.verificationStatus !== "number" || !Number.isFinite(value.verificationStatus) ||
    typeof value.accountStyle !== "number" || !Number.isFinite(value.accountStyle) ||
    !(value.avatarUrl === null || typeof value.avatarUrl === "string") ||
    !(value.coverUrl === null || typeof value.coverUrl === "string")
  ) return null;

  return {
    id: value.id,
    accountId: value.accountId,
    displayName: value.displayName,
    avatarUrl: value.avatarUrl ?? "",
    coverUrl: value.coverUrl ?? "",
    gender: value.gender as Gender,
    role: value.role,
    isVerified: value.isVerified,
    verificationStatus: value.verificationStatus,
    accountStyle: value.accountStyle,
  };
};
