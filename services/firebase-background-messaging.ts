import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getCurrentNotificationData } from "@/utils/push-notification-time";
import {
  dismissIncomingCallNotification,
  INCOMING_CALL_CHANNEL_ID,
  replaceDelegatedIncomingCallNotification,
} from "@/services/incoming-call-notification.service";
import { showRichChatNotification } from "@/services/chat-push-notification.service";
import {
  isCallLifecycleNotificationType,
} from "@/features/calls/call-waiting";
import {
  clearPendingIncomingCall,
  savePendingIncomingCall,
} from "@/services/pending-incoming-call.service";
import { rejectVoiceCall } from "@/services/call.service";

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};
const isIncomingCallNotification = (value: unknown) =>
  value === "IncomingCall" || value === "GroupCall";

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

    if (data.incomingCallAction === "reject") {
      const callId = firstText(data.callId);
      if (!callId) return;
      await clearPendingIncomingCall(callId);
      if (data.type !== "GroupCall") await rejectVoiceCall(callId);
      return;
    }

    if (data.incomingCallAction === "accept") {
      // IncomingCallActionReceiver opens the existing route with the complete
      // payload. Do not persist another ringing overlay after an explicit answer.
      return;
    }

    if (isCallLifecycleNotificationType(data.type)) {
      const callId = firstText(data.callId);
      if (callId) {
        await clearPendingIncomingCall(callId);
        await dismissIncomingCallNotification(callId);
      }
      return;
    }

    if (
      isIncomingCallNotification(data.type) &&
      remoteMessage.notification?.android?.channelId !==
        INCOMING_CALL_CHANNEL_ID
    ) {
      const callerName = firstText(
        data.callerDisplayName,
        data.callerName,
        data.senderName,
        data.displayName,
      );
      await savePendingIncomingCall(notificationData);
      if (Platform.OS === "android") {
        // IncomingCallMessagingReceiver already rendered CallStyle synchronously.
        // The headless task owns persistence/API work only, preventing duplicates.
        return;
      }
      const notificationId = await replaceDelegatedIncomingCallNotification({
        body:
          remoteMessage.notification?.body ||
          (callerName
            ? `${callerName} đang gọi cho bạn`
            : "Bạn có một cuộc gọi ANKT đến"),
        callId: firstText(data.callId),
        data: notificationData,
        title:
          callerName ||
          remoteMessage.notification?.title ||
          "Cuộc gọi ANKT đến",
      });
      console.info("[FCM background] incoming call notification scheduled", {
        messageId: remoteMessage.messageId,
        notificationId,
      });
      return;
    }

    if (data.type === "chat") {
      const notificationId = await showRichChatNotification(notificationData);
      console.info("[FCM background] rich chat notification displayed", {
        messageId: remoteMessage.messageId,
        notificationId,
      });
      return;
    }

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
        title: title || "ANKT",
      },
      trigger: null,
    });
    console.info("[FCM background] local notification scheduled", {
      messageId: remoteMessage.messageId,
      notificationId,
    });
  });
}
