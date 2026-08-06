import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
} from "@notifee/react-native";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";

import {
  CALL_ANSWER_TIMEOUT_MS,
  getIncomingCallNotificationId,
  INCOMING_CALL_CHANNEL_ID,
  INCOMING_CALL_RINGTONE_ANDROID,
  INCOMING_CALL_RINGTONE_FILE,
  INCOMING_CALL_VIBRATION_PATTERN,
  shouldUseFullScreenCallAction,
} from "@/features/calls/call-waiting";

export { INCOMING_CALL_CHANNEL_ID };
export const INCOMING_CALL_CATEGORY_ID = "incoming_calls";
export const INCOMING_CALL_ACCEPT_ACTION = "incoming_call_accept";
export const INCOMING_CALL_REJECT_ACTION = "incoming_call_reject";
export const INCOMING_CALL_LOCAL_SOURCE = "incoming-call-local";
export const dismissIncomingCallNotification = async (callId: string) => {
  const notificationId = getIncomingCallNotificationId(callId);
  if (!notificationId) return;

  if (Platform.OS === "android") {
    await notifee.cancelNotification(notificationId);
  }

  const notifications = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    notifications
      .filter((notification) => notification.request.content.data?.callId === callId)
      .map((notification) =>
        Notifications.dismissNotificationAsync(notification.request.identifier),
      ),
  );
};

export const ensureIncomingCallNotificationChannel = async () => {
  await Notifications.setNotificationCategoryAsync(
    INCOMING_CALL_CATEGORY_ID,
    [
      {
        buttonTitle: "Từ chối",
        identifier: INCOMING_CALL_REJECT_ACTION,
        options: {
          isDestructive: true,
          opensAppToForeground: true,
        },
      },
      {
        buttonTitle: "Trả lời",
        identifier: INCOMING_CALL_ACCEPT_ACTION,
        options: {
          opensAppToForeground: true,
        },
      },
    ],
  );

  if (Platform.OS !== "android") return;

  await notifee.createChannel({
    id: INCOMING_CALL_CHANNEL_ID,
    name: "Cuộc gọi đến",
    description: "Thông báo khi có cuộc gọi ANKT đến",
    importance: AndroidImportance.HIGH,
    lights: true,
    lightColor: "#24DDE4",
    sound: INCOMING_CALL_RINGTONE_ANDROID,
    vibration: true,
    vibrationPattern: INCOMING_CALL_VIBRATION_PATTERN,
  });

  await Notifications.setNotificationChannelAsync(
    INCOMING_CALL_CHANNEL_ID,
    {
      description: "Thông báo khi có cuộc gọi ANKT đến",
      enableLights: true,
      enableVibrate: true,
      importance: Notifications.AndroidImportance.MAX,
      lightColor: "#24DDE4",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      name: "Cuộc gọi đến",
      showBadge: true,
      sound: INCOMING_CALL_RINGTONE_FILE,
      vibrationPattern: INCOMING_CALL_VIBRATION_PATTERN,
    },
  );
};

export const scheduleIncomingCallNotification = async ({
  body,
  data,
  title,
}: {
  body?: string;
  data: Record<string, unknown>;
  title?: string;
}) => {
  await ensureIncomingCallNotificationChannel();

  if (Platform.OS === "android") {
    const notificationData = Object.fromEntries(
      Object.entries({
        ...data,
        deliverySource: INCOMING_CALL_LOCAL_SOURCE,
      }).map(([key, value]) => [key, String(value ?? "")]),
    );
    const callerAvatar =
      typeof data.callerAvatarUrl === "string"
        ? data.callerAvatarUrl
        : typeof data.callerAvatar === "string"
          ? data.callerAvatar
          : undefined;
    const callerName = title || "Người dùng ANKT";
    const isVideoCall = String(data.callType) === "1";
    const callDescription =
      body ||
      (isVideoCall
        ? "Cuộc gọi video đến · Chạm để trả lời"
        : "Cuộc gọi thoại đến · Chạm để trả lời");

    return notifee.displayNotification({
      id:
        typeof data.callId === "string"
          ? getIncomingCallNotificationId(data.callId)
          : undefined,
      title: callerName,
      body: callDescription,
      data: notificationData,
      android: {
        actions: [
          {
            title: "Từ chối",
            pressAction: { id: INCOMING_CALL_REJECT_ACTION },
          },
          {
            title: "Trả lời",
            pressAction: {
              id: INCOMING_CALL_ACCEPT_ACTION,
              launchActivity: "default",
            },
          },
        ],
        autoCancel: false,
        category: AndroidCategory.CALL,
        channelId: INCOMING_CALL_CHANNEL_ID,
        circularLargeIcon: true,
        color: "#24DDE4",
        fullScreenAction: shouldUseFullScreenCallAction(AppState.currentState)
          ? {
              id: INCOMING_CALL_ACCEPT_ACTION,
              launchActivity: "default",
            }
          : undefined,
        importance: AndroidImportance.HIGH,
        largeIcon: callerAvatar,
        lightUpScreen: true,
        loopSound: true,
        ongoing: true,
        sound: INCOMING_CALL_RINGTONE_ANDROID,
        pressAction: {
          id: INCOMING_CALL_ACCEPT_ACTION,
          launchActivity: "default",
        },
        smallIcon: "notification_icon",
        style: {
          summary: "ANKT · Cuộc gọi đến",
          text: callDescription,
          title: callerName,
          type: AndroidStyle.BIGTEXT,
        },
        timeoutAfter: CALL_ANSWER_TIMEOUT_MS,
        vibrationPattern: INCOMING_CALL_VIBRATION_PATTERN,
        visibility: AndroidVisibility.PUBLIC,
      },
    });
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      autoDismiss: false,
      body: body || "Đang gọi cho bạn...",
      categoryIdentifier: INCOMING_CALL_CATEGORY_ID,
      data: { ...data, deliverySource: INCOMING_CALL_LOCAL_SOURCE },
      interruptionLevel: "timeSensitive",
      priority: Notifications.AndroidNotificationPriority.MAX,
      sound: INCOMING_CALL_RINGTONE_FILE,
      sticky: true,
      subtitle: "Cuộc gọi ANKT đến",
      title: title || "Người dùng ANKT",
      vibrate: INCOMING_CALL_VIBRATION_PATTERN,
    },
    trigger: null,
  });
};

export const replaceDelegatedIncomingCallNotification = async ({
  body,
  callId,
  data,
  title,
}: {
  body?: string;
  callId?: string;
  data: Record<string, unknown>;
  title?: string;
}) => {
  if (Platform.OS === "android" && callId) {
    // FCM posts notification payloads itself before the background handler runs.
    // Remove that default-channel copy before presenting the call-channel copy.
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter(
          (notification) =>
            notification.request.content.data?.callId === callId &&
            notification.request.content.data?.deliverySource !==
              INCOMING_CALL_LOCAL_SOURCE,
        )
        .map((notification) =>
          Notifications.dismissNotificationAsync(
            notification.request.identifier,
          ),
        ),
    );
  }

  return scheduleIncomingCallNotification({ body, data, title });
};
