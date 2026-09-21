import type { Gender, User } from "../types/auth";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isGender = (value: unknown): value is Gender =>
  value === 0 || value === 1 || value === 2;

export const parseUserResponse = (value: unknown): User | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" || !value.id ||
    typeof value.accountId !== "string" || !value.accountId ||
    typeof value.displayName !== "string" ||
    !isGender(value.gender) ||
    !isNumber(value.role) ||
    typeof value.isVerified !== "boolean" ||
    !isNumber(value.verificationStatus) ||
    !isNumber(value.accountStyle) ||
    !(value.avatarUrl === null || typeof value.avatarUrl === "string") ||
    !(value.coverUrl === null || typeof value.coverUrl === "string")
  ) return null;

  return {
    id: value.id,
    accountId: value.accountId,
    displayName: value.displayName,
    avatarUrl: value.avatarUrl ?? "",
    coverUrl: value.coverUrl ?? "",
    gender: value.gender,
    role: value.role,
    isVerified: value.isVerified,
    verificationStatus: value.verificationStatus,
    accountStyle: value.accountStyle,
  };
};
