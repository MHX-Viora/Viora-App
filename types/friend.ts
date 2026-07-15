export type FriendStatus = "Pending" | "Accepted" | "Rejected";

export type FriendListUser = {
  id: string;
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
  mutualFriendCount: number;
};

export type FriendListItem = {
  friendshipId: string;
  status: FriendStatus;
  createdAt: string;
  respondedAt: string | null;
  user: FriendListUser;
};

export type FriendListResponse = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: FriendListItem[];
};

export type FriendListQuery = {
  page: number;
  pageSize: number;
  status: FriendStatus;
  keyword?: string;
};
