import { authenticatedFetch } from "@/services/authenticated-fetch";
import { getAccessToken, getUser } from "@/stores/session-store";
import type {
  ApiReel,
  CreateReelInput,
  Hashtag,
  HashtagsResponse,
  Reel,
  ReelsResponse,
  ReelSort,
} from "@/types/reel";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=Viora&background=2868D7&color=fff";

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
  if (typeof data === "string" && data.trim()) {
    if (data.includes("502 Bad Gateway")) {
      return "Backend đang trả 502 Bad Gateway khi upload video. Đây là lỗi từ server/gateway, thường do backend timeout, crash hoặc file video quá lớn.";
    }

    if (data.trim().startsWith("<!DOCTYPE") || data.trim().startsWith("<html")) {
      return fallback;
    }

    return data;
  }

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

const getFileName = (uri: string) => {
  const name = uri.split("/").pop()?.split("?")[0];
  return name?.includes(".") ? name : "reel.mp4";
};

const getVideoMimeType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  if (extension === "m4v") return "video/x-m4v";
  return "video/mp4";
};

const hasVideoExtension = (fileName: string) =>
  /\.(mp4|mov|m4v|webm)$/i.test(fileName);

const getVideoFileName = (fileName: string) =>
  hasVideoExtension(fileName) ? fileName : `${fileName || "reel"}.mp4`;

const getUploadVideoType = (fileName: string, mimeType?: string) =>
  mimeType?.startsWith("video/") ? mimeType : getVideoMimeType(fileName);

const uploadFormData = async (
  url: string,
  formData: FormData,
): Promise<{ ok: boolean; status: number; text: string }> => {
  const token = await getAccessToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", url);
    xhr.timeout = 180000;
    xhr.setRequestHeader("Accept", "text/plain");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: typeof xhr.responseText === "string" ? xhr.responseText : "",
      });
    };
    xhr.onerror = () => {
      reject(
        new Error(
          "Không thể kết nối API khi đăng reels. Kiểm tra mạng, API URL hoặc file video đã chọn.",
        ),
      );
    };
    xhr.ontimeout = () => {
      reject(
        new Error(
          "Đăng reels quá lâu không có phản hồi. Video có thể quá lớn hoặc server đang chậm.",
        ),
      );
    };
    xhr.send(formData);
  });
};

const getHashtagName = (tag: unknown) => {
  if (typeof tag === "string") return tag.replace(/^#/, "").trim();
  if (isRecord(tag) && typeof tag.name === "string") {
    return tag.name.replace(/^#/, "").trim();
  }
  return "";
};

export const formatReelCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
};

const mapReel = (
  reel: ApiReel,
  currentUserId?: string | null,
): Reel => {
  const videoMedia = reel.media?.find((media) => media.mediaUrl);
  const thumbnailMedia =
    videoMedia ?? reel.media?.find((media) => media.thumbnailUrl);

  return {
    id: reel.id,
    authorId: reel.user?.id ?? null,
    author: reel.user?.displayName?.trim() || "Người dùng Viora",
    avatar: reel.user?.avatarUrl || DEFAULT_AVATAR,
    caption: reel.content || "",
    comments: formatReelCount(reel.commentCount ?? 0),
    hashtags: (reel.hashtags ?? [])
      .map(getHashtagName)
      .filter(Boolean)
      .map((tag) => `#${tag}`)
      .join("  "),
    isAuthorVerified: reel.user?.isVerified ?? false,
    isFollowing: reel.user?.isFollowing ?? false,
    isMine: !!currentUserId && reel.user?.id === currentUserId,
    isReacted: reel.isReacted ?? false,
    isSaved: reel.isSaved ?? false,
    reactionCount: reel.reactionCount ?? 0,
    reactionType: reel.reactionType ?? 0,
    saveCount: reel.saveCount ?? 0,
    shareCount: reel.shareCount ?? 0,
    thumbnailUrl: thumbnailMedia?.thumbnailUrl || "",
    likes: formatReelCount(reel.reactionCount ?? 0),
    sourceSize: reel.location?.trim() || "Video",
    videoUrl: videoMedia?.mediaUrl || "",
  };
};

export const getReels = async ({
  keyword = "",
  page,
  pageSize,
  sort,
  userId,
}: {
  keyword?: string;
  page: number;
  pageSize: number;
  sort: ReelSort;
  userId?: string;
}): Promise<{ reels: Reel[]; totalPages: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort,
  });

  if (keyword.trim()) params.append("keyword", keyword.trim());
  if (userId?.trim()) params.append("userId", userId.trim());

  const response = await authenticatedFetch(`${BASE_URL}/api/reels?${params}`);
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể tải reels."));
  }

  const reelsResponse = data as ReelsResponse;
  const currentUser = await getUser();

  return {
    reels: reelsResponse.items
      .map((reel) => mapReel(reel, currentUser?.id))
      .filter((reel) => reel.videoUrl),
    totalPages: reelsResponse.totalPages,
  };
};

export const createReel = async ({
  content,
  hashtags,
  videoName,
  videoType,
  videoUri,
}: CreateReelInput): Promise<Reel> => {
  const formData = new FormData();
  const fileName = getVideoFileName(videoName?.trim() || getFileName(videoUri));

  formData.append("content", content);
  hashtags
    .map(getHashtagName)
    .filter(Boolean)
    .forEach((tag) => formData.append("hashtags", tag));
  formData.append("video", {
    name: fileName,
    type: getUploadVideoType(fileName, videoType),
    uri: videoUri,
  } as unknown as Blob);

  const response = await uploadFormData(`${BASE_URL}/api/reels`, formData);
  const text = response.text;
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể đăng reels."));
  }

  const currentUser = await getUser();
  return mapReel(data as ApiReel, currentUser?.id);
};

export const searchHashtags = async ({
  keyword,
  page = 1,
  pageSize = 20,
}: {
  keyword: string;
  page?: number;
  pageSize?: number;
}): Promise<Hashtag[]> => {
  const params = new URLSearchParams({
    keyword: keyword.replace(/^#/, "").trim(),
    page: String(page),
    pageSize: String(pageSize),
  });

  const response = await authenticatedFetch(
    `${BASE_URL}/api/hashtags?${params}`,
  );
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Không thể tìm hashtag."));
  }

  const items = isRecord(data) && Array.isArray(data.items) ? data.items : [];

  return items
    .filter(isRecord)
    .map((item) => ({
      id: String(item.id ?? item.name ?? ""),
      name: String(item.name ?? "").replace(/^#/, ""),
      postCount:
        typeof item.postCount === "number"
          ? item.postCount
          : Number(item.postCount ?? 0),
    }))
    .filter((item) => item.name);
};
