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

export enum MessageType {
  Text = 0,
  Image = 1,
  Video = 2,
  File = 3,
  Audio = 4,
  Sticker = 5,
  Location = 6,
  Recall = 7,
  System = 100,
}

export type ChatSticker = {
  id: string;
  stickerPackId: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  format: number;
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
  canSendMessage?: boolean | number;
  onlyAdminCanSend?: boolean;
  createdBy?: ChatParticipant | null;
  membersPreview?: ChatGroupMember[];
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

export type ChatGroupMember = {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  isOnline: boolean;
  isVerified: boolean;
  joinedAt: string;
  role: number;
};

export type ChatGroupMembersPage = {
  items: ChatGroupMember[];
  page: number;
  totalPages: number;
};

export type ChatGroupPreviewMember = {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  isFriend: boolean;
  isVerified: boolean;
};

export type ChatGroupPreview = {
  avatarUrl: string | null;
  conversationId: string;
  groupId: string;
  inviteCode: string | null;
  isJoined: boolean;
  memberCount: number;
  members: ChatGroupPreviewMember[];
  name: string;
};

export type JoinGroupResult = {
  conversationId: string;
  status: "joined" | "pending";
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
  clientRenderId?: string;
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
  mentions?: import("@/types/mention").MentionReference[];
  sticker?: ChatSticker | null;
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

export type ChatUnreadSummary = {
  totalUnreadCount: number;
};

export type MessagesPage = {
  conversation: Pick<
    Conversation,
    | "avatarUrl"
    | "blockedBy"
    | "conversationType"
    | "id"
    | "isBlocked"
    | "memberCount"
    | "name"
    | "onlyAdminCanSend"
    | "otherParticipant"
    | "role"
    | "canSendMessage"
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
  file?: File;
  kind: "image" | "video" | "audio" | "file";
  size?: number;
  duration?: number;
};
