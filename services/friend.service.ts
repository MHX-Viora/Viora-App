import { authenticatedFetch } from "@/services/authenticated-fetch";
import type {
  FriendListItem,
  FriendListQuery,
  FriendListResponse,
  FriendListUser,
  FriendStatus,
} from "@/types/friend";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

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

const getErrorMessage = (data: unknown, fallback: string) => {
  if (typeof data === "string" && data.trim()) return data;
  if (isRecord(data) && typeof data.message === "string") return data.message;
  if (isRecord(data) && typeof data.title === "string") return data.title;
  return fallback;
};

const getHttpErrorMessage = (
  response: Response,
  data: unknown,
  fallback: string,
) => `${getErrorMessage(data, fallback)} (${response.status})`;

const toNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const isFriendStatus = (value: unknown): value is FriendStatus =>
  value === "Pending" || value === "Accepted" || value === "Rejected";

const mapFriendUser = (value: unknown): FriendListUser => {
  if (!isRecord(value)) {
    throw new Error("Phản hồi người dùng trong danh sách bạn bè không hợp lệ.");
  }

  return {
    avatarUrl: toString(value.avatarUrl),
    displayName: toString(value.displayName, "Người dùng"),
    id: toString(value.id),
    isVerified: value.isVerified === true,
    mutualFriendCount: toNumber(value.mutualFriendCount),
  };
};

const mapFriendItem = (value: unknown): FriendListItem => {
  if (!isRecord(value)) {
    throw new Error("Phản hồi bạn bè không hợp lệ.");
  }

  return {
    createdAt: toString(value.createdAt),
    friendshipId: toString(value.friendshipId),
    respondedAt: typeof value.respondedAt === "string" ? value.respondedAt : null,
    status: isFriendStatus(value.status) ? value.status : "Pending",
    user: mapFriendUser(value.user),
  };
};

const mapFriendListResponse = (value: unknown): FriendListResponse => {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error("Phản hồi danh sách bạn bè không hợp lệ.");
  }

  return {
    items: value.items.map(mapFriendItem),
    page: toNumber(value.page, 1),
    pageSize: toNumber(value.pageSize, 20),
    totalItems: toNumber(value.totalItems),
    totalPages: toNumber(value.totalPages, 1),
  };
};

export const getFriends = async (
  query: FriendListQuery,
): Promise<FriendListResponse> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    status: query.status,
  });

  const keyword = query.keyword?.trim();
  if (keyword) params.set("keyword", keyword);

  const response = await authenticatedFetch(
    `${BASE_URL}/api/friends?${params.toString()}`,
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(
      getHttpErrorMessage(response, data, "Không thể tải danh sách bạn bè."),
    );
  }

  return mapFriendListResponse(data);
};

export const acceptFriendRequest = async (
  friendshipId: string,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/friends/${friendshipId}/accept`,
    { method: "PUT" },
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(
      getHttpErrorMessage(response, data, "Không thể đồng ý lời mời kết bạn."),
    );
  }
};

export const rejectFriendRequest = async (
  friendshipId: string,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/friends/${friendshipId}/reject`,
    { method: "PUT" },
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(
      getHttpErrorMessage(response, data, "Không thể từ chối lời mời kết bạn."),
    );
  }
};
