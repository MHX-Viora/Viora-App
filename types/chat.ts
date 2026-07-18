export type ChatParticipant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified?: boolean;
  isStranger?: boolean;
  friendship?: {
    status: string | null;
    isRequester: boolean;
  } | null;
};

export type ChatAttachment = {
  id: string;
  name: string;
  url: string;
  type: "image" | "video" | "audio" | "file";
  thumbnailUrl: string | null;
};

export type ChatReaction = {
  id: string;
  emoji: string;
  count: number;
  isMine: boolean;
};

export type ChatReply = {
  id: string;
  senderName: string;
  content: string;
};

export type LastMessage = {
  attachments: ChatAttachment[];
  id: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  isDeleted?: boolean;
  messageType: number | null;
};

export type Conversation = {
  id: string;
  conversationType: "Private" | "Group";
  name: string;
  avatarUrl: string | null;
  otherParticipant: ChatParticipant | null;
  blockedBy?: ChatParticipant | null;
  memberCount?: number;
  role?: number;
  lastMessage: LastMessage | null;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isBlocked?: boolean;
};

export type ConversationBlockedChangedEvent = {
  conversationId: string;
  isBlocked: boolean;
};

export type ChatSharedAttachment = ChatAttachment & {
  createdAt: string;
  sender: ChatParticipant | null;
};

export type ChatSharedLink = {
  id: string;
  url: string;
  sender: ChatParticipant | null;
  createdAt: string;
};

export type ChatSearchResult = {
  id: string;
  conversationId: string;
  content: string;
  sender: ChatParticipant | null;
  createdAt: string;
};

export type ChatSharedAttachmentsPage = {
  items: ChatSharedAttachment[];
  page: number;
  totalPages: number;
};

export type ChatSharedLinksPage = {
  items: ChatSharedLink[];
  page: number;
  totalPages: number;
};

export type ChatSearchResultsPage = {
  items: ChatSearchResult[];
  page: number;
  totalPages: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  sender: ChatParticipant;
  messageType: number | null;
  content: string;
  createdAt: string;
  isMine: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  deletedBy?: string;
  attachments: ChatAttachment[];
  reply: ChatReply | null;
  reactions: ChatReaction[];
  sendStatus?: "sending" | "failed" | "sent";
};

export type ConversationReadEvent = {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  readAt: string;
  unreadCount: number;
};

export type ConversationPinnedChangedEvent = {
  conversationId: string;
  isPinned: boolean;
};

export type ConversationMutedChangedEvent = {
  conversationId: string;
  isMuted: boolean;
};

export type MessageDeliveredEvent = {
  conversationId: string;
  messageId: string;
  userId: string;
  deliveredAt: string;
};

export type MessageDeletedEvent = {
  conversationId: string;
  messageId: string;
  deletedBy: string;
  deletedAt: string;
};

export type NewMessageNotificationEvent = {
  conversationAvatarUrl: string | null;
  conversationId: string;
  conversationName: string;
  conversationType: "Private" | "Group";
  isMuted: boolean;
  message: {
    attachments: ChatAttachment[];
    content: string;
    createdAt: string;
    id: string;
    messageType: number | null;
  };
  sender: ChatParticipant | null;
  unreadCount: number;
};

export type ConversationsPage = {
  items: Conversation[];
  page: number;
  totalPages: number;
};

export type MessagesPage = {
  conversation: Pick<
    Conversation,
    "id" | "conversationType" | "isBlocked" | "blockedBy"
  > | null;
  items: ChatMessage[];
  page: number;
  totalPages: number;
};

export type SendMessageAttachment = {
  id: string;
  uri: string;
  name: string;
  type: string;
  kind: "image" | "video" | "audio" | "file";
  size?: number;
  duration?: number;
};
