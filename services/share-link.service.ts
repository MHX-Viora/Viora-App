import { authenticatedFetch } from "@/services/authenticated-fetch";
import type { ShareLink } from "@/types/share-link";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const parseResponseText = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getErrorMessage = (data: unknown, fallback: string) => {
  if (typeof data === "string" && data.trim()) return data;
  if (isRecord(data) && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (isRecord(data) && typeof data.title === "string" && data.title.trim()) {
    return data.title;
  }
  return fallback;
};

const mapShareLink = (data: unknown): ShareLink | null => {
  if (!isRecord(data)) return null;
  const shareUrl = asString(data.shareUrl);
  if (!shareUrl) return null;

  return {
    id: asString(data.id),
    inviteCode: asString(data.inviteCode) || undefined,
    shareUrl,
    type: asString(data.type, "Unknown"),
  };
};

const getShareLink = async (
  path: string,
  fallback: string,
): Promise<ShareLink> => {
  const response = await authenticatedFetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, fallback));
  }

  const link = mapShareLink(data);
  if (!link) throw new Error("Backend trả về share link không hợp lệ.");
  return link;
};

export const getUserShareLink = (userId: string) =>
  getShareLink(
    `/api/users/${encodeURIComponent(userId)}/share`,
    "Không thể lấy liên kết hồ sơ.",
  );

export const getPostShareLink = (postId: string) =>
  getShareLink(
    `/api/posts/${encodeURIComponent(postId)}/share`,
    "Không thể lấy liên kết bài viết.",
  );

export const getReelShareLink = (reelId: string) =>
  getShareLink(
    `/api/reels/${encodeURIComponent(reelId)}/share`,
    "Không thể lấy liên kết reels.",
  );

export const getGroupShareLink = (groupId: string) =>
  getShareLink(
    `/api/chat/groups/${encodeURIComponent(groupId)}/share`,
    "Không thể lấy liên kết nhóm.",
  );
