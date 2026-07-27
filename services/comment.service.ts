import { authenticatedFetch } from "@/services/authenticated-fetch";
import type {
  Comment,
  CommentLikeResult,
  CommentsResponse,
  RepliesResponse,
  Reply,
} from "@/types/comment";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseResponseText = (text: string) => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

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

export const getComments = async ({
  page,
  pageSize,
  postId,
  sort = "newest",
}: {
  page: number;
  pageSize: number;
  postId: string;
  sort?: "newest";
}): Promise<{ comments: Comment[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort,
  });

  const response = await authenticatedFetch(
    `${BASE_URL}/api/posts/${postId}/comments?${params}`,
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể tải bình luận."));
  }

  const commentsResponse = data as CommentsResponse;

  return {
    comments: commentsResponse.items,
    totalPages: commentsResponse.totalPages,
  };
};

export const createComment = async ({
  content,
  mentionUserIds,
  postId,
}: {
  content: string;
  mentionUserIds?: string[];
  postId: string;
}): Promise<Comment> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/posts/${postId}/comments`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content, mentionUserIds }),
    },
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể gửi bình luận."));
  }

  return data as Comment;
};

export const getReplies = async ({
  commentId,
  page,
  pageSize,
  sort = "oldest",
}: {
  commentId: string;
  page: number;
  pageSize: number;
  sort?: "oldest";
}): Promise<{ replies: Reply[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort,
  });

  const response = await authenticatedFetch(
    `${BASE_URL}/api/comments/${commentId}/replies?${params}`,
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể tải trả lời."));
  }

  const repliesResponse = data as RepliesResponse;

  return {
    replies: repliesResponse.items,
    totalPages: repliesResponse.totalPages,
  };
};

export const createReply = async ({
  commentId,
  content,
  mentionUserIds,
}: {
  commentId: string;
  content: string;
  mentionUserIds?: string[];
}): Promise<Reply> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/comments/${commentId}/replies`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content, mentionUserIds }),
    },
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể gửi trả lời."));
  }

  return data as Reply;
};

export const likeComment = async (
  commentId: string,
): Promise<CommentLikeResult> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/comments/${commentId}/like`,
    {
      method: "POST",
      headers: { Accept: "application/json, text/plain" },
    },
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể thích bình luận."));
  }

  const payload = isRecord(data) && isRecord(data.data) ? data.data : data;

  return {
    commentId:
      isRecord(payload) && typeof payload.commentId === "string"
        ? payload.commentId
        : commentId,
    isLiked:
      isRecord(payload) && typeof payload.isLiked === "boolean"
        ? payload.isLiked
        : false,
    likeCount:
      isRecord(payload) && typeof payload.likeCount === "number"
        ? payload.likeCount
        : 0,
  };
};
