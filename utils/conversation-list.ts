import { ChatApiError } from "@/services/chat.service";
import type { Conversation } from "@/types/chat";

export const isConversationGoneError = (error: unknown) =>
  error instanceof ChatApiError &&
  (error.status === 404 || error.status === 410);

export const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

export const getLastMessageTime = (conversation: Conversation) => {
  const value = conversation.lastMessage?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

export const sortConversations = (items: Conversation[]) =>
  [...items].sort((left, right) => {
    if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
    return getLastMessageTime(right) - getLastMessageTime(left);
  });

export const mergeConversations = (
  current: Conversation[],
  incoming: Conversation[],
) => {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return sortConversations(
    current
      .map((item) => byId.get(item.id) ?? item)
      .concat(
        incoming.filter((item) => !current.some((old) => old.id === item.id)),
      ),
  );
};

export const getConversationTitle = (conversation: Conversation) =>
  conversation.conversationType === "Private"
    ? (conversation.otherParticipant?.displayName ?? conversation.name)
    : conversation.name;

export const getConversationAvatar = (conversation: Conversation) =>
  conversation.conversationType === "Private"
    ? (conversation.otherParticipant?.avatarUrl ?? conversation.avatarUrl)
    : conversation.avatarUrl;

export const getConversationRouteParams = (
  conversation: Conversation,
  scrollToMessageId?: string,
) => {
  const avatar = getConversationAvatar(conversation);
  return {
    conversationAvatarUrl: avatar ?? "",
    conversationId: conversation.id,
    conversationName: getConversationTitle(conversation),
    conversationType: conversation.conversationType,
    isMuted: String(conversation.isMuted),
    isPinned: String(conversation.isPinned),
    isVerified: String(conversation.otherParticipant?.isVerified ?? false),
    memberCount: String(conversation.memberCount ?? ""),
    otherAvatarUrl: conversation.otherParticipant?.avatarUrl ?? "",
    otherUserId: conversation.otherParticipant?.id ?? "",
    otherUserName: conversation.otherParticipant?.displayName ?? "",
    role: String(conversation.role ?? 0),
    scrollToMessageId,
  };
};

export const getLastMessageText = (conversation: Conversation) => {
  const lastMessage = conversation.lastMessage;
  if (!lastMessage) return "Chưa có tin nhắn.";

  if (lastMessage.isDeleted || lastMessage.messageType === 7) {
    return `${lastMessage.isMine ? "Bạn: " : ""}Tin nhắn đã được thu hồi`;
  }

  const content = lastMessage.content.trim();
  if (content) return `${lastMessage.isMine ? "Bạn: " : ""}${content}`;

  const attachmentType = lastMessage.attachments[0]?.type;
  const mediaText =
    attachmentType === "image" || lastMessage.messageType === 1
      ? "Ảnh"
      : attachmentType === "video" || lastMessage.messageType === 2
        ? "Video"
        : attachmentType === "audio" || lastMessage.messageType === 4
          ? "Âm thanh"
          : attachmentType === "file" || lastMessage.messageType === 3
            ? "Tài liệu"
            : "Tin nhắn";

  return `${lastMessage.isMine ? "Bạn: " : ""}${mediaText}`;
};
