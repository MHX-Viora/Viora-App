import { getActiveChatConversation } from "@/features/chat/chat-events";
import type { NewMessageNotificationEvent } from "@/types/chat";
import { showRichChatNotification } from "@/services/chat-push-notification.service";
import { claimChatNotification } from "@/utils/chat-notification-dedupe";

const getMessagePreview = (event: NewMessageNotificationEvent) => {
  const content = event.message.content.trim();
  if (content) return content;

  const attachmentType = event.message.attachments[0]?.type;
  if (attachmentType === "image" || event.message.messageType === 1) {
    return "Đã gửi một ảnh";
  }
  if (attachmentType === "video" || event.message.messageType === 2) {
    return "Đã gửi một video";
  }
  if (attachmentType === "audio" || event.message.messageType === 4) {
    return "Đã gửi một âm thanh";
  }
  if (attachmentType === "file" || event.message.messageType === 3) {
    return "Đã gửi một tài liệu";
  }
  return "Bạn có tin nhắn mới";
};

export const showChatRealtimeNotification = async (
  event: NewMessageNotificationEvent,
) => {
  if (event.isMuted) return;
  if (getActiveChatConversation() === event.conversationId) return;

  const dedupeKey = event.message.id || event.conversationId;
  if (!claimChatNotification(dedupeKey)) {
    console.info("[ChatSync] message deduped", {
      conversationId: event.conversationId,
      messageId: event.message.id,
      source: "signalr",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    await showRichChatNotification({
      conversationAvatarUrl: event.conversationAvatarUrl,
      conversationId: event.conversationId,
      conversationName: event.conversationName,
      conversationType: String(event.conversationType),
      createdAt: event.message.createdAt,
      deliverySource: "signalr-local",
      messageId: event.message.id,
      messageType: String(event.message.messageType),
      messagePreview: getMessagePreview(event),
      senderAvatarUrl: event.sender?.avatarUrl,
      senderId: event.sender?.id,
      senderName: event.sender?.displayName ?? event.conversationName,
      type: "chat",
    });
  } catch (error) {
    console.info(
      "[Chat] foreground notification skipped",
      error instanceof Error ? error.message : String(error),
    );
  }
};
