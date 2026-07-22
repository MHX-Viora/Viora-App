import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getCurrentNotificationData } from "@/utils/push-notification-time";

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

if (Platform.OS !== "web") {
  console.info("[FCM background] handler registered", {
    timestamp: new Date().toISOString(),
  });

  setBackgroundMessageHandler(getMessaging(getApp()), async (remoteMessage) => {
    const data = remoteMessage.data ?? {};
    const notificationData = getCurrentNotificationData(Object.fromEntries(
      Object.entries(data).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ));
    console.info("[FCM background] message received", {
      collapseKey: remoteMessage.collapseKey,
      data,
      from: remoteMessage.from,
      messageId: remoteMessage.messageId,
      notification: remoteMessage.notification
        ? {
            android: remoteMessage.notification.android,
            body: remoteMessage.notification.body,
            title: remoteMessage.notification.title,
          }
        : null,
      sentTime: remoteMessage.sentTime,
      ttl: remoteMessage.ttl,
    });

    if (remoteMessage.notification) {
      console.info("[FCM background] system notification delegated", {
        channelId: remoteMessage.notification.android?.channelId,
        messageId: remoteMessage.messageId,
        reason: "notification payload is displayed by Android",
      });
      return;
    }

    const title = firstText(data.title, data.senderName, data.conversationName);
    const body = firstText(data.body, data.content, data.message);
    if (!title && !body) {
      console.info("[FCM background] data-only notification skipped", {
        messageId: remoteMessage.messageId,
        reason: "missing title and body",
      });
      return;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        body: body || undefined,
        data: notificationData,
        sound: "default",
        title: title || "Viora",
      },
      trigger: null,
    });
    console.info("[FCM background] local notification scheduled", {
      messageId: remoteMessage.messageId,
      notificationId,
    });
  });
}
