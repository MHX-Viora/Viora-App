const ALLOWED_SHARE_HOSTS = new Set(["api.mxh.ankt.vn", "viora.app"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cleanValue = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
};

const pathSegments = (url: URL) =>
  url.pathname.split("/").map(cleanValue).filter(Boolean);

export const parseProfileQrValue = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const segments = pathSegments(url);
    if (url.protocol === "viora:" && url.hostname === "profile") {
      return segments[0] || null;
    }
    if (
      url.protocol === "https:" &&
      ALLOWED_SHARE_HOSTS.has(url.hostname.toLowerCase()) &&
      ["user", "users", "profile"].includes(segments[0]?.toLowerCase())
    ) {
      return segments[1] || null;
    }
  } catch {
    return null;
  }

  return null;
};

export type GroupQrTarget =
  | { inviteCode: string }
  | { conversationId: string };

export const parseGroupQrValue = (value: string): GroupQrTarget | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (UUID_PATTERN.test(trimmed)) return { conversationId: trimmed };

  try {
    const url = new URL(trimmed);
    const segments = pathSegments(url);
    if (
      url.protocol === "https:" &&
      ALLOWED_SHARE_HOSTS.has(url.hostname.toLowerCase()) &&
      segments[0]?.toLowerCase() === "group"
    ) {
      const inviteCode = segments[1];
      return inviteCode ? { inviteCode } : null;
    }

    if (url.protocol !== "viora:") return null;
    if (url.hostname === "chat" && segments[0] === "group-preview") {
      const inviteCode = cleanValue(url.searchParams.get("inviteCode"));
      if (inviteCode) return { inviteCode };
      const groupId = cleanValue(url.searchParams.get("groupId"));
      return UUID_PATTERN.test(groupId) ? { conversationId: groupId } : null;
    }
    if (url.hostname === "chat" && segments[0] === "group") {
      return UUID_PATTERN.test(segments[1])
        ? { conversationId: segments[1] }
        : null;
    }
    if (url.hostname === "group") {
      return UUID_PATTERN.test(segments[0])
        ? { conversationId: segments[0] }
        : null;
    }
  } catch {
    return null;
  }

  return null;
};
