import type {
  ChatAttachment,
  ChatMessage,
  ChatParticipant,
  ChatReaction,
  ChatReply,
  ChatSearchResult,
  ChatSearchResultsPage,
  ChatSharedAttachment,
  ChatSharedAttachmentsPage,
  ChatSharedLink,
  ChatSharedLinksPage,
  Conversation,
  ConversationBlockedChangedEvent,
  ConversationMutedChangedEvent,
  ConversationPinnedChangedEvent,
  ConversationReadEvent,
  ConversationsPage,
  LastMessage,
  MessageDeletedEvent,
  MessageDeliveredEvent,
  MessagesPage,
  NewMessageNotificationEvent,
} from "@/types/chat";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asBoolean = (value: unknown) => value === true;

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const asNullableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asConversationType = (value: unknown): "Private" | "Group" =>
  asString(value) === "Private" ? "Private" : "Group";

const mapParticipant = (value: unknown): ChatParticipant | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.userId);
  if (!id) return null;
  return {
    avatarUrl: asString(value.avatarUrl ?? value.avatar, "") || null,
    displayName: asString(value.displayName ?? value.name ?? value.fullName, "Người dùng"),
    id,
    isVerified: asBoolean(value.isVerified),
  };
};

const mapLastMessage = (value: unknown): LastMessage | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  return {
    attachments: asArray(value.attachments ?? value.files)
      .map(mapAttachment)
      .filter((item): item is ChatAttachment => item !== null),
    content: asString(value.content ?? value.text),
    createdAt: asString(value.createdAt ?? value.sentAt),
    id: id || asString(value.createdAt ?? value.sentAt),
    isDeleted: asBoolean(value.isDeleted),
    isMine: asBoolean(value.isMine),
    messageType: asNullableNumber(value.messageType ?? value.type),
  };
};

const mapAttachment = (value: unknown): ChatAttachment | null => {
  if (!isRecord(value)) return null;
  const url = asString(value.url ?? value.fileUrl);
  if (!url) return null;
  const rawType = asString(value.type ?? value.fileType ?? value.mimeType).toLowerCase();
  const type = rawType.includes("image")
    ? "image"
    : rawType.includes("video")
      ? "video"
      : rawType.includes("audio")
        ? "audio"
        : "file";

  return {
    id: asString(value.id, url),
    name: asString(value.name ?? value.fileName, "Tệp đính kèm"),
    thumbnailUrl: asString(value.thumbnailUrl, "") || null,
    type,
    url,
  };
};

const mapReaction = (value: unknown): ChatReaction | null => {
  if (!isRecord(value)) return null;
  const emoji = asString(value.emoji ?? value.reaction);
  if (!emoji) return null;
  return {
    count: asNumber(value.count, 1),
    emoji,
    id: asString(value.id, emoji),
    isMine: asBoolean(value.isMine),
  };
};

const mapReply = (value: unknown): ChatReply | null => {
  if (!isRecord(value)) return null;
  const sender = isRecord(value.sender) ? value.sender : null;
  const id = asString(value.id ?? value.messageId ?? value.replyMessageId);
  if (!id) return null;
  return {
    content: asString(value.content) || "Tệp đính kèm",
    id,
    senderName: asString(
      value.senderName ??
        value.senderDisplayName ??
        sender?.displayName ??
        sender?.name,
      "Tin nhắn",
    ),
  };
};

export const mapConversation = (value: unknown): Conversation | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.conversationId);
  if (!id) return null;
  const type = asConversationType(value.conversationType ?? value.type);
  const otherParticipant = mapParticipant(value.otherParticipant ?? value.participant);

  return {
    avatarUrl: asString(value.avatarUrl ?? value.avatar, "") || null,
    conversationType: type,
    id,
    isBlocked: asBoolean(value.isBlocked),
    isMuted: asBoolean(value.isMuted),
    isPinned: asBoolean(value.isPinned),
    lastMessage: mapLastMessage(value.lastMessage),
    memberCount: asNumber(value.memberCount ?? value.membersCount, 0),
    name: asString(value.name ?? value.title, type === "Private" ? "Cuộc trò chuyện" : "Nhóm"),
    otherParticipant,
    unreadCount: asNumber(value.unreadCount),
  };
};

export const mapMessage = (value: unknown): ChatMessage | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.messageId);
  const sender = mapParticipant(value.sender ?? value.user);
  if (!id || !sender) return null;

  return {
    attachments: asArray(value.attachments).map(mapAttachment).filter((item): item is ChatAttachment => item !== null),
    content: asString(value.content ?? value.text),
    conversationId: asString(value.conversationId),
    createdAt: asString(value.createdAt ?? value.sentAt),
    deletedBy: asString(value.deletedBy, "") || undefined,
    id,
    isDeleted: asBoolean(value.isDeleted),
    isEdited: asBoolean(value.isEdited),
    isMine: asBoolean(value.isMine),
    messageType: asNullableNumber(value.messageType),
    reactions: asArray(value.reactions).map(mapReaction).filter((item): item is ChatReaction => item !== null),
    reply: mapReply(value.reply ?? value.replyMessage ?? value.replyTo),
    sender,
  };
};

export const mapConversationReadEvent = (
  value: unknown,
): ConversationReadEvent | null => {
  if (!isRecord(value)) return null;
  const conversationId = asString(value.conversationId);
  const userId = asString(value.userId);
  if (!conversationId || !userId) return null;
  return {
    conversationId,
    lastReadMessageId: asString(value.lastReadMessageId),
    readAt: asString(value.readAt),
    unreadCount: asNumber(value.unreadCount),
    userId,
  };
};

export const mapConversationPinnedChangedEvent = (
  value: unknown,
): ConversationPinnedChangedEvent | null => {
  if (!isRecord(value)) return null;
  const conversationId = asString(value.conversationId ?? value.id);
  if (!conversationId) return null;
  return {
    conversationId,
    isPinned: asBoolean(value.isPinned),
  };
};

export const mapConversationMutedChangedEvent = (
  value: unknown,
): ConversationMutedChangedEvent | null => {
  if (!isRecord(value)) return null;
  const conversationId = asString(value.conversationId ?? value.id);
  if (!conversationId) return null;
  return {
    conversationId,
    isMuted: asBoolean(value.isMuted),
  };
};

export const mapConversationBlockedChangedEvent = (
  value: unknown,
): ConversationBlockedChangedEvent | null => {
  if (!isRecord(value)) return null;
  const conversationId = asString(value.conversationId ?? value.id);
  if (!conversationId) return null;
  return {
    conversationId,
    isBlocked: asBoolean(value.isBlocked),
  };
};

export const mapMessageDeliveredEvent = (
  value: unknown,
): MessageDeliveredEvent | null => {
  if (!isRecord(value)) return null;
  const conversationId = asString(value.conversationId);
  const messageId = asString(value.messageId);
  const userId = asString(value.userId);
  if (!conversationId || !messageId || !userId) return null;
  return {
    conversationId,
    deliveredAt: asString(value.deliveredAt),
    messageId,
    userId,
  };
};

export const mapMessageDeletedEvent = (
  value: unknown,
): MessageDeletedEvent | null => {
  if (!isRecord(value)) return null;
  const conversationId = asString(value.conversationId);
  const messageId = asString(value.messageId);
  const deletedBy = asString(value.deletedBy);
  if (!conversationId || !messageId || !deletedBy) return null;
  return {
    conversationId,
    deletedAt: asString(value.deletedAt),
    deletedBy,
    messageId,
  };
};

export const mapNewMessageNotificationEvent = (
  value: unknown,
): NewMessageNotificationEvent | null => {
  if (!isRecord(value)) return null;
  const conversationId = asString(value.conversationId);
  const message = isRecord(value.message) ? value.message : null;
  if (!conversationId || !message) return null;
  return {
    conversationAvatarUrl:
      asString(value.conversationAvatarUrl ?? value.avatarUrl, "") || null,
    conversationId,
    conversationName: asString(value.conversationName ?? value.name, "Chat"),
    conversationType: asConversationType(value.conversationType),
    isMuted: asBoolean(value.isMuted),
    message: {
      attachments: asArray(message.attachments)
        .map(mapAttachment)
        .filter((item): item is ChatAttachment => item !== null),
      content: asString(message.content ?? message.text),
      createdAt: asString(message.createdAt ?? message.sentAt),
      id: asString(message.id),
      messageType: asNullableNumber(message.messageType),
    },
    sender: mapParticipant(value.sender),
    unreadCount: asNumber(value.unreadCount),
  };
};

const pageItems = (data: unknown) =>
  isRecord(data) ? asArray(data.items ?? data.data ?? data.results) : [];

const mapSharedAttachment = (value: unknown): ChatSharedAttachment | null => {
  if (!isRecord(value)) return null;
  const attachment = mapAttachment(value.attachment ?? value);
  if (!attachment) return null;
  return {
    ...attachment,
    createdAt: asString(value.createdAt ?? value.sentAt),
    sender: mapParticipant(value.sender ?? value.user),
  };
};

const mapSharedLink = (value: unknown): ChatSharedLink | null => {
  if (!isRecord(value)) return null;
  const url = asString(value.url ?? value.link ?? value.content);
  if (!url) return null;
  return {
    createdAt: asString(value.createdAt ?? value.sentAt),
    id: asString(value.id, url),
    sender: mapParticipant(value.sender ?? value.user),
    url,
  };
};

const mapSearchResult = (value: unknown): ChatSearchResult | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.messageId);
  if (!id) return null;
  return {
    content: asString(value.content ?? value.text),
    conversationId: asString(value.conversationId),
    createdAt: asString(value.createdAt ?? value.sentAt),
    id,
    sender: mapParticipant(value.sender ?? value.user),
  };
};

export const mapConversationsPage = (data: unknown): ConversationsPage => ({
  items: pageItems(data).map(mapConversation).filter((item): item is Conversation => item !== null),
  page: isRecord(data) ? asNumber(data.page, 1) : 1,
  totalPages: isRecord(data) ? asNumber(data.totalPages, asNumber(data.totalPage, 1)) : 1,
});

export const mapMessagesPage = (data: unknown): MessagesPage => ({
  items: pageItems(data).map(mapMessage).filter((item): item is ChatMessage => item !== null),
  page: isRecord(data) ? asNumber(data.page, 1) : 1,
  totalPages: isRecord(data) ? asNumber(data.totalPages, asNumber(data.totalPage, 1)) : 1,
});

export const mapSharedAttachmentsPage = (
  data: unknown,
): ChatSharedAttachmentsPage => ({
  items: pageItems(data)
    .map(mapSharedAttachment)
    .filter((item): item is ChatSharedAttachment => item !== null),
  page: isRecord(data) ? asNumber(data.page, 1) : 1,
  totalPages: isRecord(data)
    ? asNumber(data.totalPages, asNumber(data.totalPage, 1))
    : 1,
});

export const mapSharedLinksPage = (data: unknown): ChatSharedLinksPage => ({
  items: pageItems(data)
    .map(mapSharedLink)
    .filter((item): item is ChatSharedLink => item !== null),
  page: isRecord(data) ? asNumber(data.page, 1) : 1,
  totalPages: isRecord(data)
    ? asNumber(data.totalPages, asNumber(data.totalPage, 1))
    : 1,
});

export const mapSearchResultsPage = (data: unknown): ChatSearchResultsPage => ({
  items: pageItems(data)
    .map(mapSearchResult)
    .filter((item): item is ChatSearchResult => item !== null),
  page: isRecord(data) ? asNumber(data.page, 1) : 1,
  totalPages: isRecord(data)
    ? asNumber(data.totalPages, asNumber(data.totalPage, 1))
    : 1,
});
