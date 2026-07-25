import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
} from "@notifee/react-native";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const INCOMING_CALL_CHANNEL_ID = "incoming-calls";
export const INCOMING_CALL_CATEGORY_ID = "incoming_calls";
export const INCOMING_CALL_ACCEPT_ACTION = "incoming_call_accept";
export const INCOMING_CALL_REJECT_ACTION = "incoming_call_reject";
export const INCOMING_CALL_LOCAL_SOURCE = "incoming-call-local";
const INCOMING_CALL_VIBRATION_PATTERN = [0, 500, 250, 500, 250, 900];

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
    description: "Thông báo khi có cuộc gọi Viora đến",
    importance: AndroidImportance.HIGH,
    lights: true,
    lightColor: "#24DDE4",
    sound: "default",
    vibration: true,
    vibrationPattern: INCOMING_CALL_VIBRATION_PATTERN,
  });

  await Notifications.setNotificationChannelAsync(
    INCOMING_CALL_CHANNEL_ID,
    {
      description: "Thông báo khi có cuộc gọi Viora đến",
      enableLights: true,
      enableVibrate: true,
      importance: Notifications.AndroidImportance.MAX,
      lightColor: "#24DDE4",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      name: "Cuộc gọi đến",
      showBadge: true,
      sound: "default",
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

    return notifee.displayNotification({
      id:
        typeof data.callId === "string"
          ? `incoming-call-${data.callId}`
          : undefined,
      title: title || "Người dùng Viora",
      body: body || "Đang gọi cho bạn...",
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
        fullScreenAction: {
          id: INCOMING_CALL_ACCEPT_ACTION,
          launchActivity: "default",
        },
        importance: AndroidImportance.HIGH,
        largeIcon: callerAvatar,
        lightUpScreen: true,
        loopSound: true,
        ongoing: true,
        pressAction: {
          id: INCOMING_CALL_ACCEPT_ACTION,
          launchActivity: "default",
        },
        smallIcon: "notification_icon",
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
      sound: "default",
      sticky: true,
      subtitle: "Cuộc gọi Viora đến",
      title: title || "Người dùng Viora",
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
