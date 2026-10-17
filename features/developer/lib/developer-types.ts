export type DeveloperAccount = { id: string; fullName: string; email: string; emailVerifiedAt: string | null; avatarUrl: string | null; status: "PendingVerification" | "Active" | "Suspended"; hasPassword: boolean };
export type DeveloperSession = { id: string; deviceInfo: string; createdAt: string; lastUsedAt: string; expiresAt: string; current: boolean };
export type LinkedIdentity = { id: string; provider: string; linkedAt: string };
export function isDeveloperAccount(value: unknown): value is DeveloperAccount {
  if (!value || typeof value !== "object") return false;
  const a = value as Partial<DeveloperAccount>;
  return typeof a.id === "string" && typeof a.fullName === "string" && typeof a.email === "string" && a.status === "Active" && typeof a.emailVerifiedAt === "string" && typeof a.hasPassword === "boolean";
}
