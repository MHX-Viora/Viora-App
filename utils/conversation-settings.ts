import type { Conversation } from "@/types/chat";

export const isGroupConversation = (conversation: Conversation) =>
  conversation.conversationType === "Group";

export const isPrivateConversation = (conversation: Conversation) =>
  conversation.conversationType === "Private";

export const canManageGroup = (conversation: Conversation) =>
  isGroupConversation(conversation) &&
  (conversation.role === 1 || conversation.role === 2);

export const isGroupOwner = (conversation: Conversation) =>
  isGroupConversation(conversation) && conversation.role === 2;

export const getConversationName = (conversation: Conversation) =>
  isPrivateConversation(conversation)
    ? (conversation.otherParticipant?.displayName ?? conversation.name)
    : conversation.name;

export const getConversationAvatar = (conversation: Conversation) =>
  isPrivateConversation(conversation)
    ? (conversation.otherParticipant?.avatarUrl ?? conversation.avatarUrl)
    : conversation.avatarUrl;

export const getPermissionLabel = (value?: boolean | number) => {
  if (typeof value !== "number") return "Mọi người";
  if (value === 1) return "Quản trị viên và chủ nhóm";
  if (value === 2) return "Chỉ chủ nhóm";
  return "Mọi người";
};

export const toParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export const normalizeConversationId = (value: string) =>
  value.replace(/-(attachments|links|report|search)(?:-|$).*/, "");
