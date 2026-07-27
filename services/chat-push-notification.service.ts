import notifee, {
  AndroidImportance,
  AndroidStyle,
  type Notification,
} from "@notifee/react-native";

import {
  getChatMessagingStyleProps,
  getChatNotificationImageProps,
  mapChatPushNotification,
  type ChatPushNotificationModel,
} from "@/services/chat-push-notification-data";

export const CHAT_NOTIFICATION_CHANNEL_ID = "messages";

const ensureChatNotificationChannel = () =>
  notifee.createChannel({
    id: CHAT_NOTIFICATION_CHANNEL_ID,
    importance: AndroidImportance.HIGH,
    name: "Tin nhắn",
    sound: "default",
    vibration: true,
  });

const buildNotification = (
  model: ChatPushNotificationModel,
  includeAvatar: boolean,
): Notification => {
  const imageProps = getChatNotificationImageProps(model, includeAvatar);
  const messagingStyleProps = getChatMessagingStyleProps(model);
  const sender = {
    ...imageProps.sender,
    id: model.senderId || model.senderName,
    name: model.senderName,
  };

  return {
    android: {
      ...imageProps.android,
      channelId: CHAT_NOTIFICATION_CHANNEL_ID,
      circularLargeIcon: true,
      color: "#2868D7",
      pressAction: {
        id: "default",
        launchActivity: "default",
      },
      smallIcon: "notification_icon",
      style: {
        ...messagingStyleProps,
        messages: [
          {
            person: sender,
            text: model.body,
            timestamp: model.timestamp,
          },
        ],
        person: {
          id: "viora-current-user",
          name: "Bạn",
        },
        type: AndroidStyle.MESSAGING,
      },
    },
    body: model.isGroupConversation
      ? `${model.senderName}: ${model.body}`
      : model.body,
    data: model.data,
    id:
      model.conversationId || model.messageId
        ? `chat-${model.conversationId || model.messageId}`
        : undefined,
    title: model.title,
  };
};

export const showRichChatNotification = async (
  input: Record<string, unknown>,
) => {
  const model = mapChatPushNotification(input);
  await ensureChatNotificationChannel();

  try {
    return await notifee.displayNotification(
      buildNotification(model, Boolean(model.largeIconUrl)),
    );
  } catch (error) {
    if (!model.largeIconUrl) throw error;

    console.info(
      "[ChatNotification] avatar unavailable, using generated person icon",
      error instanceof Error ? error.message : String(error),
    );
    return notifee.displayNotification(buildNotification(model, false));
  }
};
