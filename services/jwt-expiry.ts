const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return globalThis.atob(`${normalized}${padding}`);
};

export const isJwtExpiringSoon = (
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  refreshWindowSeconds = 60,
) => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return false;
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as {
      exp?: unknown;
    };
    return (
      typeof payload.exp === "number" &&
      payload.exp <= nowSeconds + refreshWindowSeconds
    );
  } catch {
    return false;
  }
};
