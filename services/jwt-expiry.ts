const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return globalThis.atob(`${normalized}${padding}`);
};

const getJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const payload: unknown = JSON.parse(decodeBase64Url(payloadPart));
    return typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

export const getJwtUserId = (token: string): string | null => {
  const userId = getJwtPayload(token)?.user_id;
  return typeof userId === "string" && userId ? userId : null;
};

export const hasSessionIdentityMismatch = (session: {
  accessToken: string;
  user: { id: string } | null;
}): boolean => {
  const tokenUserId = getJwtUserId(session.accessToken);
  return Boolean(tokenUserId && session.user?.id && tokenUserId.toLowerCase() !== session.user.id.toLowerCase());
};

export const isJwtExpiringSoon = (
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  refreshWindowSeconds = 60,
) => {
  try {
    const payload = getJwtPayload(token);
    return (
      typeof payload?.exp === "number" &&
      payload.exp <= nowSeconds + refreshWindowSeconds
    );
  } catch {
    return false;
  }
};
