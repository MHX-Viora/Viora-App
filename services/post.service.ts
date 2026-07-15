import { authenticatedFetch } from "@/services/authenticated-fetch";
import type {
  FeedPost,
  ReactionResponse,
  SavePostResponse,
} from "@/types/feed";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getApiErrorMessage = (data: unknown, fallback: string) => {
  if (typeof data === "string" && data.trim()) return data;

  if (
    isRecord(data) &&
    typeof data.message === "string" &&
    data.message.trim()
  ) {
    return data.message;
  }

  if (isRecord(data) && typeof data.title === "string" && data.title.trim()) {
    return data.title;
  }

  return fallback;
};

const parseResponseText = (text: string) => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const mapReactionResponse = (
  data: unknown,
  fallbackReactionType: number,
): ReactionResponse => {
  const payload = isRecord(data) ? data : {};
  const reactionCount =
    typeof payload.reactionCount === "number" ? payload.reactionCount : 0;
  const hasReactionType = "reactionType" in payload;
  const reactionType =
    typeof payload.reactionType === "number"
      ? payload.reactionType
      : fallbackReactionType;
  const isReacted =
    typeof payload.isReacted === "boolean"
      ? payload.isReacted
      : hasReactionType
        ? payload.reactionType !== null
        : true;

  return { isReacted, reactionCount, reactionType };
};

export const reactPost = async (
  postId: string,
  reactionType: number,
): Promise<ReactionResponse> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/posts/${postId}/reactions`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reactionType }),
    },
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể thả cảm xúc."));
  }

  return mapReactionResponse(data, reactionType);
};

export const savePost = async (postId: string): Promise<SavePostResponse> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/posts/${postId}/save`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    },
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể lưu bài viết."));
  }

  return data as SavePostResponse;
};

export const sharePost = async (postId: string): Promise<FeedPost> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/posts/${postId}/share`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "" }),
    },
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể chia sẻ bài viết."));
  }

  return data as FeedPost;
};

export const deletePost = async (postId: string): Promise<string> => {
  const response = await authenticatedFetch(`${BASE_URL}/api/posts/${postId}`, {
    method: "DELETE",
    headers: { Accept: "text/plain" },
  });
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể xóa bài viết."));
  }

  return isRecord(data) && typeof data.message === "string"
    ? data.message
    : "Đã xóa bài viết.";
};

export const reportPost = async ({
  description,
  postId,
  reason,
}: {
  description: string;
  postId: string;
  reason: number;
}): Promise<string> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/posts/${postId}/report`,
    {
      method: "POST",
      headers: {
        Accept: "text/plain",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description, reason }),
    },
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể báo cáo bài viết."));
  }

  return isRecord(data) && typeof data.message === "string"
    ? data.message
    : "Đã gửi báo cáo.";
};
