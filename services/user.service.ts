import { authenticatedFetch } from "@/services/authenticated-fetch";
import { buildProfileFormData } from "@/services/profile-form";
import { completeExistingOrCreate } from "@/services/profile-completion";
import { parseUserResponse } from "@/services/profile-response";
import type { ProfileInput, UpdateProfileInput, User } from "@/types/auth";
import { Platform } from "react-native";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const FORM_HEADERS = {
  Accept: "application/json",
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
  accountStyle: number;
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

class ProfileRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const saveProfile = async (
  payload: ProfileInput,
  method: "POST" | "PATCH",
): Promise<User> => {
  const formData = await buildProfileFormData(payload, Platform.OS === "web");
  const response = await authenticatedFetch(`${BASE_URL}/api/users/profile`, {
    method,
    headers: FORM_HEADERS,
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ProfileRequestError(
      getErrorMessage(data, method === "POST" ? "Không thể lưu hồ sơ." : "Không thể cập nhật hồ sơ."),
      response.status,
    );
  }

  const user = parseUserResponse(data);
  if (!user) {
    throw new Error("Phản hồi hồ sơ không hợp lệ.");
  }

  return user;
};

export const createProfile = (payload: ProfileInput): Promise<User> =>
  saveProfile(payload, "POST");

export const completeProfile = (payload: ProfileInput): Promise<User> =>
  // Google Login ở BE hiện chỉ tạo Account. Tạo User khi PATCH xác nhận chưa có hồ sơ.
  completeExistingOrCreate(
    () => saveProfile(payload, "PATCH"),
    () => saveProfile(payload, "POST"),
  );

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
    accountStyle: typeof data.accountStyle === "number" ? data.accountStyle : 0,
    postCount: toCount(data.postCount),
  };
};

export const updateProfile = async (
  payload: UpdateProfileInput,
): Promise<User> => saveProfile(payload, "PATCH");
