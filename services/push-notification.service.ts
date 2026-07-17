import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  DeviceTokenRegistrationError,
  registerDeviceToken,
} from "@/services/device-token.service";
import { navigateNotificationData } from "@/features/notifications/notification-response-navigation";
import { getActiveChatConversation } from "@/features/chat/chat-events";

const DEVICE_ID_KEY = "viora.device-id";
let notificationHandlerConfigured = false;
let notificationResponseHandlingConfigured = false;
let registrationPromise: Promise<string | null> | null = null;
const handledForegroundChatNotifications = new Map<string, number>();
const FOREGROUND_DEDUPE_MS = 10_000;

const shouldSuppressForegroundNotification = (
  data: Record<string, unknown>,
) => {
  if (data.type !== "chat") return false;

  const conversationId =
    typeof data.conversationId === "string" ? data.conversationId : "";
  const messageId = typeof data.messageId === "string" ? data.messageId : "";
  if (conversationId && getActiveChatConversation() === conversationId) {
    return true;
  }

  const dedupeKey = messageId || `${conversationId}:${String(data.createdAt ?? "")}`;
  if (!dedupeKey) return false;

  const now = Date.now();
  const lastShownAt = handledForegroundChatNotifications.get(dedupeKey) ?? 0;
  handledForegroundChatNotifications.set(dedupeKey, now);

  return now - lastShownAt < FOREGROUND_DEDUPE_MS;
};

const getDeviceId = async () => {
  const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existingId) return existingId;

  const nextId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await SecureStore.setItemAsync(DEVICE_ID_KEY, nextId);
  return nextId;
};

const getTokenPreview = (token: string) =>
  token.length <= 24 ? token : `${token.slice(0, 16)}...${token.slice(-8)}`;

const registerPushNotificationsInternal = async () => {
  try {
    console.info("[Push] registration starting", {
      appOwnership: Constants.appOwnership,
      firebaseProjectId: Constants.expoConfig?.extra?.firebaseProjectId,
      isDevice: Device.isDevice,
      packageName: Constants.expoConfig?.android?.package,
      platform: Platform.OS,
    });

    if (Constants.appOwnership === "expo") {
      console.info(
        "[Push] Expo Go không cấp FCM/APNs token thật. Hãy dùng development build để lưu DeviceToken vào DB.",
      );
      return null;
    }

    if (Platform.OS === "web" || !Device.isDevice) {
      console.info("[Push] registration skipped: unsupported device");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        importance: Notifications.AndroidImportance.HIGH,
        name: "default",
        sound: "default",
      });

      const channels = await Notifications.getNotificationChannelsAsync();
      console.info(
        "[Push] Android notification channels",
        channels.map((channel) => ({
          id: channel.id,
          importance: channel.importance,
          name: channel.name,
        })),
      );
    }

    const permissions = await Notifications.getPermissionsAsync();
    console.info("[Push] permission current", {
      android: permissions.android,
      canAskAgain: permissions.canAskAgain,
      granted: permissions.granted,
      status: permissions.status,
    });

    const finalPermissions =
      permissions.status === "granted"
        ? permissions
        : await Notifications.requestPermissionsAsync();

    console.info("[Push] permission final", {
      android: finalPermissions.android,
      canAskAgain: finalPermissions.canAskAgain,
      granted: finalPermissions.granted,
      status: finalPermissions.status,
    });

    if (finalPermissions.status !== "granted") {
      console.info("[Push] permission not granted", finalPermissions.status);
      return null;
    }

    const pushToken = await Notifications.getDevicePushTokenAsync();
    console.info("[Push] native token received", {
      tokenLength: pushToken.data.length,
      tokenPreview: getTokenPreview(pushToken.data),
      type: pushToken.type,
    });

    const deviceId = await getDeviceId();

    const result = await registerDeviceToken({
      appVersion: Constants.expoConfig?.version ?? "1.0.0",
      deviceId,
      deviceName: Device.deviceName ?? Device.modelName ?? Platform.OS,
      token: pushToken.data,
    });

    console.info("[Push] Device token registered", {
      isActive: result.isActive,
      success: result.success,
    });

    return pushToken.data;
  } catch (error) {
    if (error instanceof DeviceTokenRegistrationError) {
      console.info("[Push] Device token registration failed", {
        body: error.body,
        status: error.status,
      });
      return null;
    }

    console.info(
      "[Push] Device token registration skipped",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

export const registerPushNotifications = async () => {
  if (registrationPromise) return registrationPromise;

  registrationPromise = registerPushNotificationsInternal().finally(() => {
    registrationPromise = null;
  });

  return registrationPromise;
};

export const setupNotificationHandling = () => {
  if (notificationHandlerConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      const shouldSuppress = shouldSuppressForegroundNotification(data);
      return {
        shouldPlaySound: !shouldSuppress,
        shouldSetBadge: true,
        shouldShowBanner: !shouldSuppress,
        shouldShowList: !shouldSuppress,
      };
    },
  });

  notificationHandlerConfigured = true;
};

export const setupNotificationResponseHandling = () => {
  if (notificationResponseHandlingConfigured) return;

  const handleResponse = (response: Notifications.NotificationResponse) => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }

    const didNavigate = navigateNotificationData(
      response.notification.request.content.data as Record<string, unknown>,
    );
    if (didNavigate) {
      void Notifications.clearLastNotificationResponseAsync();
    }
  };

  Notifications.addNotificationResponseReceivedListener((response) => {
    handleResponse(response);
  });

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    handleResponse(response);
  });

  notificationResponseHandlingConfigured = true;
};
