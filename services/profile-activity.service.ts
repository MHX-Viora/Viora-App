import { authenticatedFetch } from "@/services/authenticated-fetch";
import { mapFeedPost } from "@/services/feed.service";
import { mapReel } from "@/services/reel.service";
import { getUser } from "@/stores/session-store";
import type { ApiPost, FeedPost, PostsResponse } from "@/types/feed";
import type { ApiReel, Reel, ReelsResponse } from "@/types/reel";
import type { ProfileActivityKey } from "@/types/profile-activity";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const ENDPOINTS: Record<ProfileActivityKey, string> = {
  "reacted-posts": "/api/profile/me/reacted-posts",
  "reacted-reels": "/api/profile/me/reacted-reels",
  "saved-posts": "/api/profile/me/saved-posts",
  "saved-reels": "/api/profile/me/saved-reels",
};

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

const getItems = (data: unknown): unknown[] => {
  if (isRecord(data) && Array.isArray(data.items)) return data.items;
  if (isRecord(data) && isRecord(data.data) && Array.isArray(data.data.items)) {
    return data.data.items;
  }
  if (Array.isArray(data)) return data;
  return [];
};

const getTotalPages = (data: unknown) => {
  if (!isRecord(data)) return 1;
  if (typeof data.totalPages === "number") return data.totalPages;
  if (isRecord(data.data) && typeof data.data.totalPages === "number") {
    return data.data.totalPages;
  }
  return 1;
};

export const getProfileActivityPosts = async ({
  key,
  page,
  pageSize,
}: {
  key: "reacted-posts" | "saved-posts";
  page: number;
  pageSize: number;
}): Promise<{ items: FeedPost[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await authenticatedFetch(
    `${BASE_URL}${ENDPOINTS[key]}?${params}`,
    { headers: { Accept: "application/json" } },
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể tải bài viết."));
  }

  const currentUser = await getUser();
  const items = getItems(data).map((item) =>
    mapFeedPost(item as ApiPost, currentUser),
  );

  return {
    items,
    totalPages: getTotalPages(data as PostsResponse),
  };
};

export const getProfileActivityReels = async ({
  key,
  page,
  pageSize,
}: {
  key: "reacted-reels" | "saved-reels";
  page: number;
  pageSize: number;
}): Promise<{ items: Reel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await authenticatedFetch(
    `${BASE_URL}${ENDPOINTS[key]}?${params}`,
    { headers: { Accept: "application/json" } },
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể tải video."));
  }

  const currentUser = await getUser();
  const items = getItems(data)
    .map((item) => mapReel(item as ApiReel, currentUser?.id))
    .filter((item) => item.videoUrl);

  return {
    items,
    totalPages: getTotalPages(data as ReelsResponse),
  };
};
