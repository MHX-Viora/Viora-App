import { authenticatedFetch } from "@/services/authenticated-fetch";
import { Platform } from "react-native";
import { getUser } from "@/stores/session-store";
import type {
  ApiPost,
  CreatePostInput,
  FeedPost,
  PostFeedSort,
  PostsResponse,
} from "@/types/feed";
import { formatPostTime } from "@/utils/post-format";
import { normalizePostLink } from "@/utils/post-link";
import { appendPostImage } from "@/utils/post-upload";
import { isOwnPost } from "@/utils/post-ownership";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=ANKT&background=2868D7&color=fff";

const FORM_HEADERS = {
  Accept: "application/json",
};

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
    return typeof data.detail === "string" && data.detail.trim() ? data.detail : data.title;
  }

  return fallback;
};

export const mapFeedPost = (
  post: ApiPost,
  currentUser?: { displayName?: string; avatarUrl?: string; id?: string } | null,
): FeedPost => ({
  id: post.id,
  author:
    post.user?.displayName?.trim() ||
    currentUser?.displayName?.trim() ||
    "Người dùng ANKT",
  authorId: post.user?.id ?? (post.isMine || post.isOwner ? currentUser?.id ?? null : null),
  avatar: post.user?.avatarUrl || currentUser?.avatarUrl || DEFAULT_AVATAR,
  body: post.content || "",
  comments: post.commentCount ?? 0,
  images: (post.media ?? [])
    .map((media) => media.mediaUrl || media.url || media.thumbnailUrl || "")
    .filter(Boolean),
  isAuthorVerified: post.user?.isVerified ?? false,
  authorAccountStyle: post.user?.accountStyle ?? 0,
  isMine: isOwnPost(post, currentUser?.id),
  isReacted: post.isReacted ?? false,
  isSaved: post.isSaved ?? false,
  link: normalizePostLink(post.link),
  location: (post.location ?? post.locationName)?.trim() || null,
  publishedAt: formatPostTime(post.createdAt),
  reactionType: post.reactionType ?? 0,
  reactions: post.reactionCount ?? 0,
  saveCount: post.saveCount ?? 0,
  shares: post.shareCount ?? 0,
  visibility: post.visibility ?? 0,
  mentions: post.mentions ?? [],
  postType: post.postType ?? 0,
  viewCount: post.viewCount ?? 0,
  article: post.article ?? null,
});

export const getPosts = async ({
  keyword = "",
  page,
  pageSize,
  postType,
  sort,
  userId,
}: {
  keyword?: string;
  page: number;
  pageSize: number;
  postType?: number;
  sort?: PostFeedSort;
  userId?: string;
}): Promise<{ posts: FeedPost[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (keyword.trim()) params.append("keyword", keyword.trim());
  if (sort !== "recommended" && postType !== undefined) {
    params.append("postType", String(postType));
  }
  if (sort && sort !== "recommended") params.append("sort", sort);
  if (userId?.trim()) params.append("userId", userId.trim());

  const endpoint =
    sort === "recommended"
      ? `${BASE_URL}/api/articles/recommended?${params}`
      : `${BASE_URL}/api/feed?${params}`;
  const response = await authenticatedFetch(endpoint);
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể tải bài viết."));
  }

  const postsResponse = data as PostsResponse;
  const currentUser = await getUser();

  return {
    posts: postsResponse.items.map((post) => mapFeedPost(post, currentUser)),
    totalPages: postsResponse.totalPages,
  };
};

export const getPostById = async (postId: string): Promise<FeedPost> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/posts/${encodeURIComponent(postId)}`,
    { headers: { Accept: "application/json" } },
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "KhÃ´ng thá»ƒ táº£i bÃ i viáº¿t."));
  }

  const currentUser = await getUser();
  return mapFeedPost(data as ApiPost, currentUser);
};

export const createPost = async (
  payload: CreatePostInput,
): Promise<FeedPost> => {
  const formData = new FormData();
  formData.append("content", payload.content);
  formData.append("visibility", String(payload.visibility));

  if (payload.latitude !== undefined) {
    formData.append("latitude", String(payload.latitude));
  }

  if (payload.longitude !== undefined) {
    formData.append("longitude", String(payload.longitude));
  }

  if (payload.locationName?.trim()) {
    formData.append("locationName", payload.locationName.trim());
  }

  if (payload.link?.trim()) {
    formData.append("link", payload.link.trim());
  }

  payload.mentionUserIds?.forEach((id) =>
    formData.append("mentionUserIds", id),
  );

  for (const [index, uri] of payload.files.entries()) {
    await appendPostImage(formData, uri, index, Platform.OS === "web");
  }

  const response = await authenticatedFetch(`${BASE_URL}/api/feed`, {
    method: "POST",
    headers: FORM_HEADERS,
    body: formData,
  });
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể tạo bài viết."));
  }

  const currentUser = await getUser();
  return mapFeedPost({ ...(data as ApiPost), user: currentUser, isMine: true }, currentUser);
};
