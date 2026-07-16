import { authenticatedFetch } from "@/services/authenticated-fetch";
import type { ProfileInput, UpdateProfileInput, User } from "@/types/auth";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const FORM_HEADERS = {
  Accept: "application/json",
};

type ApiError = {
  message?: unknown;
  title?: unknown;
  status?: unknown;
};

export type UserStatistics = {
  postCount: number;
  followerCount: number;
  followingCount: number;
  friendCount: number;
};

export type FollowUserResponse = {
  isFollowing: boolean;
  followerCount: number;
};

export type SendFriendRequestResponse = {
  success: boolean;
  message: string;
  friendshipId: string;
  status: string;
};

export type UserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string;
  coverUrl: string;
  gender: number;
  isVerified: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  friendCount: number;
  isFollowing: boolean;
  friendship: {
    friendshipId: string;
    status: string | null;
    isRequester: boolean;
  } | null;
  canMessage: boolean;
  conversationId: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toCount = (value: unknown) => (typeof value === "number" ? value : 0);

const toString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const parseResponseText = (text: string) => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

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

const isUser = (value: unknown): value is User => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.accountId === "string" &&
    typeof value.displayName === "string" &&
    typeof value.avatarUrl === "string" &&
    typeof value.coverUrl === "string" &&
    typeof value.role === "number" &&
    typeof value.isVerified === "boolean" &&
    typeof value.verificationStatus === "number"
  );
};

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

const appendImage = (formData: FormData, fieldName: string, uri: string) => {
  const fileName = getFileName(uri, `${fieldName.toLowerCase()}.jpg`);

  formData.append(fieldName, {
    uri,
    name: fileName,
    type: getFileType(fileName),
  } as unknown as Blob);
};

export const createProfile = async (payload: ProfileInput): Promise<User> => {
  const formData = new FormData();
  formData.append("DisplayName", payload.displayName);
  formData.append("Gender", String(payload.gender));
  appendImage(formData, "Avatar", payload.avatarUrl);
  appendImage(formData, "Cover", payload.coverUrl);

  const response = await authenticatedFetch(`${BASE_URL}/api/users/profile`, {
    method: "POST",
    headers: FORM_HEADERS,
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || (isRecord(data) && data.status === 0)) {
    const error = data as ApiError;
    let message = "Không thể lưu hồ sơ.";

    if (typeof error.message === "string" && error.message.trim()) {
      message = error.message;
    } else if (typeof error.title === "string" && error.title.trim()) {
      message = error.title;
    }

    throw new Error(message);
  }

  if (!isUser(data)) {
    throw new Error("Phản hồi hồ sơ không hợp lệ.");
  }

  return data;
};

export const getMyStatistics = async (): Promise<UserStatistics> => {
  const response = await authenticatedFetch(`${BASE_URL}/api/users/me/statistics`);
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể tải thống kê hồ sơ."));
  }

  if (!isRecord(data)) {
    throw new Error("Phản hồi thống kê hồ sơ không hợp lệ.");
  }

  return {
    followerCount: toCount(data.followerCount),
    followingCount: toCount(data.followingCount),
    friendCount: toCount(data.friendCount),
    postCount: toCount(data.postCount),
  };
};

export const followUser = async (userId: string): Promise<FollowUserResponse> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/users/${userId}/follow`,
    { method: "POST" },
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể theo dõi người dùng."));
  }

  if (!isRecord(data)) {
    throw new Error("Phản hồi theo dõi không hợp lệ.");
  }

  return {
    followerCount: toCount(data.followerCount),
    isFollowing: data.isFollowing === true,
  };
};

export const sendFriendRequest = async (
  userId: string,
): Promise<SendFriendRequestResponse> => {
  const response = await authenticatedFetch(`${BASE_URL}/api/friends/request`, {
    body: JSON.stringify({ userId }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể gửi lời mời kết bạn."));
  }

  if (!isRecord(data)) {
    throw new Error("Phản hồi gửi lời mời kết bạn không hợp lệ.");
  }

  const responseData = isRecord(data.data) ? data.data : null;

  return {
    friendshipId:
      responseData
        ? toString(responseData.friendshipId, toString(responseData.id))
        : "",
    message: typeof data.message === "string" ? data.message : "",
    status:
      responseData && typeof responseData.status === "string"
        ? responseData.status
        : "pending",
    success: data.success === true,
  };
};

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/users/${userId}/profile`,
  );
  const data = parseResponseText(await response.text());

  if (response.status === 404) {
    throw new Error("Không tìm thấy người dùng này.");
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể tải hồ sơ."));
  }

  if (!isRecord(data) || typeof data.id !== "string") {
    throw new Error("Phản hồi hồ sơ không hợp lệ.");
  }

  const friendship = isRecord(data.friendship)
    ? {
        friendshipId: toString(
          data.friendship.friendshipId,
          toString(data.friendship.id),
        ),
        isRequester: data.friendship.isRequester === true,
        status:
          typeof data.friendship.status === "string"
            ? data.friendship.status
            : null,
      }
    : null;

  return {
    avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : "",
    canMessage: data.canMessage === true,
    conversationId:
      typeof data.conversationId === "string" ? data.conversationId : null,
    coverUrl: typeof data.coverUrl === "string" ? data.coverUrl : "",
    displayName:
      typeof data.displayName === "string" ? data.displayName : "Người dùng",
    followerCount: toCount(data.followerCount),
    followingCount: toCount(data.followingCount),
    friendCount: toCount(data.friendCount),
    friendship,
    gender: typeof data.gender === "number" ? data.gender : 0,
    id: data.id,
    isFollowing: data.isFollowing === true,
    isVerified: data.isVerified === true,
    postCount: toCount(data.postCount),
  };
};

export const updateProfile = async (
  payload: UpdateProfileInput,
): Promise<User> => {
  const formData = new FormData();
  formData.append("DisplayName", payload.displayName);
  formData.append("Gender", String(payload.gender));

  if (payload.avatarUrl) {
    appendImage(formData, "Avatar", payload.avatarUrl);
  }

  if (payload.coverUrl) {
    appendImage(formData, "Cover", payload.coverUrl);
  }

  const response = await authenticatedFetch(`${BASE_URL}/api/users/profile`, {
    method: "PATCH",
    headers: FORM_HEADERS,
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || (isRecord(data) && data.status === 0)) {
    const error = data as ApiError;
    let message = "Không thể cập nhật hồ sơ.";

    if (typeof error.message === "string" && error.message.trim()) {
      message = error.message;
    } else if (typeof error.title === "string" && error.title.trim()) {
      message = error.title;
    }

    throw new Error(message);
  }

  if (!isUser(data)) {
    throw new Error("Phản hồi hồ sơ không hợp lệ.");
  }

  return data;
};
