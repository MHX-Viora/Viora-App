import { MessageType } from "@/types/chat";
import type {
  ChatAttachment,
  ChatGroupPreview,
  ChatGroupPreviewMember,
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

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const asBoolean = (value: unknown) => value === true;

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const asNullableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getMessagePayload = (value: unknown): unknown => {
  if (!isRecord(value) || !isRecord(value.message)) return value;
  return {
    ...value.message,
    conversationId: value.message.conversationId ?? value.conversationId,
  };
};

const asConversationType = (value: unknown): "Private" | "Group" => {
  if (value === 0 || asString(value) === "0" || asString(value) === "Private") {
    return "Private";
  }
  return "Group";
};

const asAttachmentType = (
  fileType: unknown,
  typeValue: unknown,
  mimeType: unknown,
): ChatAttachment["type"] => {
  const numericType = asNullableNumber(fileType ?? typeValue);
  if (numericType === 1) return "image";
  if (numericType === 2) return "video";
  if (numericType === 4) return "audio";
  if (numericType === 3) return "file";

  const rawType = asString(typeValue ?? mimeType).toLowerCase();
  if (rawType.includes("image")) return "image";
  if (rawType.includes("video")) return "video";
  if (rawType.includes("audio")) return "audio";
  return "file";
};

const mapParticipant = (value: unknown): ChatParticipant | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.userId);
  if (!id) return null;
  return {
    avatarUrl: asString(value.avatarUrl ?? value.avatar, "") || null,
    displayName: asString(value.displayName ?? value.name ?? value.fullName, "Người dùng"),
    friendship: isRecord(value.friendship)
      ? {
          isRequester: asBoolean(value.friendship.isRequester),
          status: asString(value.friendship.status, "") || null,
        }
      : null,
    id,
    isStranger: asBoolean(value.isStranger),
    isVerified: asBoolean(value.isVerified),
  };
};

const mapGroupPreviewMember = (value: unknown) => {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.userId);
  if (!id) return null;
  return {
    avatarUrl: asString(value.avatarUrl ?? value.avatar, "") || null,
    displayName: asString(value.displayName ?? value.name ?? value.fullName, "Người dùng"),
    id,
    isOnline: asBoolean(value.isOnline),
    isVerified: asBoolean(value.isVerified),
    joinedAt: asString(value.joinedAt),
    role: asNumber(value.role),
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
  const type = asAttachmentType(value.fileType, value.type, value.mimeType);

  return {
    id: asString(value.id ?? value.attachmentId, url),
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
  const otherUsers = asArray(value.otherUsers);
  const otherParticipant =
    mapParticipant(value.otherParticipant ?? value.participant) ??
    mapParticipant(otherUsers[0]);

  return {
    avatarUrl: asString(value.avatarUrl ?? value.avatar, "") || null,
    canSendMessage:
      "canSendMessage" in value
        ? typeof value.canSendMessage === "boolean"
          ? value.canSendMessage
          : asNumber(value.canSendMessage, 0)
        : undefined,
    blockedBy: mapParticipant(value.blockedBy),
    conversationType: type,
    createdBy: mapParticipant(value.createdBy),
    id,
    isBlocked: asBoolean(value.isBlocked),
    isMuted: asBoolean(value.isMuted),
    isPinned: asBoolean(value.isPinned),
    lastMessage: mapLastMessage(value.lastMessage),
    memberCount: asNumber(value.memberCount ?? value.membersCount, 0),
    name: asString(value.name ?? value.title, type === "Private" ? "Cuộc trò chuyện" : "Nhóm"),
    otherParticipant,
    onlyAdminCanSend:
      "onlyAdminCanSend" in value ? asBoolean(value.onlyAdminCanSend) : undefined,
    role: asNumber(value.myRole ?? value.role ?? value.memberRole, 0),
    membersPreview: asArray(value.membersPreview)
      .map(mapGroupPreviewMember)
      .filter((item): item is NonNullable<typeof item> => item !== null),
    unreadCount: asNumber(value.unreadCount),
  };
};

export const mapMessage = (value: unknown): ChatMessage | null => {
  const payload = getMessagePayload(value);
  if (!isRecord(payload)) return null;
  const id = asString(payload.id ?? payload.messageId);
  const messageType = asNullableNumber(payload.messageType ?? payload.type);
  const sender =
    mapParticipant(payload.sender ?? payload.user) ??
    (messageType === MessageType.System
      ? {
          avatarUrl: null,
          displayName: "Hệ thống",
          id: "system",
          isVerified: false,
        }
      : null);
  if (!id || !sender) return null;

  return {
    attachments: asArray(payload.attachments).map(mapAttachment).filter((item): item is ChatAttachment => item !== null),
    content: asString(payload.content ?? payload.text),
    conversationId: asString(payload.conversationId),
    createdAt: asString(payload.createdAt ?? payload.sentAt),
    deletedBy: asString(payload.deletedBy, "") || undefined,
    id,
    isDeleted: asBoolean(payload.isDeleted),
    isEdited: asBoolean(payload.isEdited),
    isMine: asBoolean(payload.isMine),
    messageType,
    sticker: isRecord(payload.sticker)
      ? {
          format: asNumber(payload.sticker.format),
          id: asString(payload.sticker.id),
          imageUrl: asString(payload.sticker.imageUrl),
          name: asString(payload.sticker.name),
          stickerPackId: asString(payload.sticker.stickerPackId),
          thumbnailUrl: asString(payload.sticker.thumbnailUrl, "") || null,
        }
      : null,
    mentions: asArray(payload.mentions)
      .map((item) =>
        isRecord(item)
          ? {
              displayName: asString(item.displayName),
              userId: asString(item.userId),
            }
          : null,
      )
      .filter(
        (item): item is { displayName: string; userId: string } =>
          Boolean(item?.displayName && item.userId),
      ),
    reactions: asArray(payload.reactions).map(mapReaction).filter((item): item is ChatReaction => item !== null),
    reply: mapReply(payload.reply ?? payload.replyMessage ?? payload.replyTo),
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
    id: asString(value.id ?? value.messageId, url),
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

export const mapMessagesPage = (data: unknown): MessagesPage => {
  const conversation = isRecord(data)
    ? mapConversation(data.conversation)
    : null;

  return {
    conversation: conversation
      ? {
          avatarUrl: conversation.avatarUrl,
          blockedBy: conversation.blockedBy,
          conversationType: conversation.conversationType,
          id: conversation.id,
          isBlocked: conversation.isBlocked,
          memberCount: conversation.memberCount,
          name: conversation.name,
          onlyAdminCanSend: conversation.onlyAdminCanSend,
          otherParticipant: conversation.otherParticipant,
          role: conversation.role,
          canSendMessage: conversation.canSendMessage,
        }
      : null,
    items: pageItems(data)
      .map(mapMessage)
      .filter((item): item is ChatMessage => item !== null),
    page: isRecord(data) ? asNumber(data.page, 1) : 1,
    totalPages: isRecord(data)
      ? asNumber(data.totalPages, asNumber(data.totalPage, 1))
      : 1,
  };
};

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

const mapPreviewMember = (value: unknown): ChatGroupPreviewMember | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.userId);
  if (!id) return null;

  return {
    avatarUrl: asString(value.avatarUrl ?? value.avatar, "") || null,
    displayName: asString(value.displayName ?? value.name ?? value.fullName, "Người dùng"),
    id,
    isFriend: asBoolean(value.isFriend),
    isVerified: asBoolean(value.isVerified),
  };
};

export const mapGroupPreview = (
  data: unknown,
  fallbackGroupId: string,
): ChatGroupPreview | null => {
  if (!isRecord(data)) return null;
  const groupId = asString(data.groupId ?? data.id ?? data.conversationId, fallbackGroupId);
  if (!groupId) return null;

  return {
    avatarUrl: asString(data.avatarUrl ?? data.avatar, "") || null,
    conversationId: asString(data.conversationId ?? data.id, groupId),
    groupId,
    inviteCode: asString(data.inviteCode, "") || null,
    isJoined: asBoolean(data.isJoined ?? data.joined),
    memberCount: asNumber(data.memberCount ?? data.membersCount),
    members: asArray(data.members ?? data.membersPreview)
      .map(mapPreviewMember)
      .filter((item): item is ChatGroupPreviewMember => item !== null)
      .slice(0, 5),
    name: asString(data.name ?? data.title, "Nhóm"),
  };
};
