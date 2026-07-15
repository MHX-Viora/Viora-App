import { authenticatedFetch } from "@/services/authenticated-fetch";
import { getUser } from "@/stores/session-store";
import type {
  ApiPost,
  CreatePostInput,
  FeedPost,
  PostsResponse,
} from "@/types/feed";
import { formatPostTime } from "@/utils/post-format";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=Viora&background=2868D7&color=fff";

const FORM_HEADERS = {
  Accept: "application/json",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getFileName = (uri: string, fallbackName: string) => {
  const fileName = uri.split("/").pop();
  return fileName && fileName.includes(".") ? fileName : fallbackName;
};

const getFileType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
};

const appendFile = (formData: FormData, uri: string, index: number) => {
  const fileName = getFileName(uri, `post-${index + 1}.jpg`);

  formData.append("files", {
    uri,
    name: fileName,
    type: getFileType(fileName),
  } as unknown as Blob);
};

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

export const mapFeedPost = (
  post: ApiPost,
  currentUser?: { displayName?: string; avatarUrl?: string; id?: string } | null,
): FeedPost => ({
  id: post.id,
  author:
    post.user?.displayName?.trim() ||
    currentUser?.displayName?.trim() ||
    "Người dùng Viora",
  authorId: post.user?.id ?? null,
  avatar: post.user?.avatarUrl || currentUser?.avatarUrl || DEFAULT_AVATAR,
  body: post.content || "",
  comments: post.commentCount ?? 0,
  images: (post.media ?? [])
    .map((media) => media.mediaUrl || media.thumbnailUrl || "")
    .filter(Boolean),
  isAuthorVerified: post.user?.isVerified ?? false,
  isMine: !!currentUser?.id && post.user?.id === currentUser.id,
  isReacted: post.isReacted ?? false,
  isSaved: post.isSaved ?? false,
  location: post.location?.trim() || null,
  publishedAt: formatPostTime(post.createdAt),
  reactionType: post.reactionType ?? 0,
  reactions: post.reactionCount ?? 0,
  saveCount: post.saveCount ?? 0,
  shares: post.shareCount ?? 0,
  visibility: post.visibility ?? 0,
});

export const getPosts = async ({
  keyword = "",
  page,
  pageSize,
  userId,
}: {
  keyword?: string;
  page: number;
  pageSize: number;
  userId?: string;
}): Promise<{ posts: FeedPost[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (keyword.trim()) params.append("keyword", keyword.trim());
  if (userId?.trim()) params.append("userId", userId.trim());

  const response = await authenticatedFetch(`${BASE_URL}/api/feed?${params}`);
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

export const createPost = async (
  payload: CreatePostInput,
): Promise<FeedPost> => {
  const formData = new FormData();
  formData.append("post", payload.post ?? "");
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

  payload.files.forEach((uri, index) => appendFile(formData, uri, index));

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
  return mapFeedPost(data as ApiPost, currentUser);
};
