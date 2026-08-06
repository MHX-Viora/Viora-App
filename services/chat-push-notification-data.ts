export type ChatPushNotificationModel = {
  avatarUrl?: string;
  body: string;
  conversationAvatarUrl?: string;
  conversationId: string;
  conversationName: string;
  data: Record<string, string>;
  isGroupConversation: boolean;
  largeIconUrl?: string;
  messageId: string;
  senderId: string;
  senderName: string;
  title: string;
  timestamp: number;
};

export const getChatNotificationImageProps = (
  model: Pick<ChatPushNotificationModel, "avatarUrl" | "largeIconUrl">,
  includeAvatar: boolean,
) => ({
  android:
    includeAvatar && model.largeIconUrl
      ? { largeIcon: model.largeIconUrl }
      : {},
  sender:
    includeAvatar && model.avatarUrl ? { icon: model.avatarUrl } : {},
});

export const getChatMessagingStyleProps = (
  model: Pick<ChatPushNotificationModel, "isGroupConversation" | "title">,
) =>
  model.isGroupConversation
    ? { group: true, title: model.title }
    : { group: false };

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const getRemoteImageUrl = (value: unknown) => {
  const url = firstText(value);
  return /^https?:\/\//i.test(url) ? url : undefined;
};

const getTimestamp = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return Date.now();
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
};

const getMessagePreview = (
  input: Record<string, unknown>,
  messageType: string,
) => {
  const text = firstText(
    input.messagePreview,
    input.body,
    input.content,
    input.message,
  );
  if (text) return text;

  switch (messageType) {
    case "1":
      return "Đã gửi một ảnh";
    case "2":
      return "Đã gửi một video";
    case "3":
      return "Đã gửi một tài liệu";
    case "4":
      return "Đã gửi một tin nhắn thoại";
    case "5":
      return "Đã gửi một sticker";
    default:
      return "Bạn có tin nhắn mới";
  }
};

export const mapChatPushNotification = (
  input: Record<string, unknown>,
): ChatPushNotificationModel => {
  const conversationId = firstText(input.conversationId);
  const messageId = firstText(input.messageId);
  const messageType = firstText(input.messageType) || "0";
  const senderId = firstText(input.senderId);
  const senderName =
    firstText(input.senderName, input.title) || "Người dùng ANKT";
  const avatarUrl = getRemoteImageUrl(input.senderAvatarUrl);
  const conversationName = firstText(input.conversationName);
  const conversationAvatarUrl = getRemoteImageUrl(
    input.conversationAvatarUrl,
  );
  const isGroupConversation = firstText(input.conversationType) === "1";
  const body = getMessagePreview(input, messageType);
  const title =
    (isGroupConversation ? conversationName : senderName) || senderName;

  return {
    avatarUrl,
    body,
    conversationAvatarUrl,
    conversationId,
    conversationName,
    data: {
      conversationAvatarUrl: conversationAvatarUrl ?? "",
      conversationId,
      conversationName,
      conversationType: isGroupConversation ? "1" : "0",
      messageId,
      messageType,
      senderAvatarUrl: avatarUrl ?? "",
      senderId,
      senderName,
      type: "chat",
    },
    isGroupConversation,
    largeIconUrl:
      (isGroupConversation ? conversationAvatarUrl : avatarUrl) ?? avatarUrl,
    messageId,
    senderId,
    senderName,
    title,
    timestamp: getTimestamp(input.createdAt),
  };
};
