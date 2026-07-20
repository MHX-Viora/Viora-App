import type { Conversation } from "@/types/chat";

export type SelectableFriend = {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  isOnline: boolean;
  isVerified: boolean;
};

export type SelectableFriendsPage = {
  items: SelectableFriend[];
  page: number;
  totalPages: number;
};

export type SelectableFriendsQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
};

export type CreateGroupInput = {
  avatarUri?: string;
  memberIds: string[];
  name: string;
};

export type CreateGroupResponse = Conversation;
