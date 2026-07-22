import { ChatApiError } from "@/services/chat.service";
import { MessageType } from "@/types/chat";
import type { ChatAttachment, ChatMessage, SendMessageAttachment } from "@/types/chat";

export const getRealtimeConversationGroupName = (conversationId: string) =>
  `conversation:${conversationId}`;

export const isConversationGoneError = (error: unknown) =>
  error instanceof ChatApiError && (error.status === 404 || error.status === 410);

export const mergeOlder = (current: ChatMessage[], older: ChatMessage[]) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...older.filter((item) => !seen.has(item.id))];
};

export const pendingAttachmentToViewerAttachment = (
  attachment: SendMessageAttachment,
): ChatAttachment => ({
  id: attachment.id,
  name: attachment.name,
  thumbnailUrl: null,
  type: attachment.kind,
  url: attachment.uri,
});

export const markMessageRecalled = (
  message: ChatMessage,
  deletedBy?: string,
): ChatMessage => ({
  ...message,
  attachments: [],
  content: "",
  isDeleted: true,
  messageType: MessageType.Recall,
  reactions: [],
  sendStatus: "sent",
  deletedBy,
});

export const toNewestFirstMessages = (items: ChatMessage[]) => [...items].reverse();
