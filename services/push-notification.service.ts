import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { getApp } from "@react-native-firebase/app";
import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  type FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import { Platform } from "react-native";

import {
  DeviceTokenRegistrationError,
  registerDeviceToken,
  unregisterDeviceToken,
} from "@/services/device-token.service";
import { syncChatUnreadCount } from "@/services/chat-sync.service";
import { navigateNotificationData } from "@/features/notifications/notification-response-navigation";
import { getActiveChatConversation } from "@/features/chat/chat-events";
import {
  emitCallLifecycle,
  emitIncomingCall,
} from "@/features/calls/call-events";
import { claimChatNotification } from "@/utils/chat-notification-dedupe";

const DEVICE_ID_KEY = "viora.device-id";
const LAST_FCM_TOKEN_KEY = "viora.last-fcm-token";
let notificationHandlerConfigured = false;
let notificationResponseHandlingConfigured = false;
let pushTokenRefreshHandlingConfigured = false;
let registrationPromise: Promise<string | null> | null = null;
const nativeTokenRegistrationPromises = new Map<string, Promise<unknown>>();
const handledNotificationResponses = new Map<string, number>();
const NOTIFICATION_RESPONSE_DEDUPE_MS = 10_000;
const DEVICE_PUSH_TOKEN_MAX_ATTEMPTS = 5;
const DEVICE_PUSH_TOKEN_RETRY_DELAY_MS = 2500;

const messagingInstance = getMessaging(getApp());

const claimNotificationResponse = (key: string) => {
  if (!key) return true;
  const now = Date.now();
  const lastHandledAt = handledNotificationResponses.get(key) ?? 0;
  handledNotificationResponses.set(key, now);
  for (const [responseKey, handledAt] of handledNotificationResponses) {
    if (now - handledAt > NOTIFICATION_RESPONSE_DEDUPE_MS) {
      handledNotificationResponses.delete(responseKey);
    }
  }
  return now - lastHandledAt >= NOTIFICATION_RESPONSE_DEDUPE_MS;
};

const shouldSuppressForegroundNotification = (
  data: Record<string, unknown>,
) => {
  if (data.type !== "chat") return false;

  const conversationId =
    typeof data.conversationId === "string" ? data.conversationId : "";
  const isClaimedSignalrNotification = data.deliverySource === "signalr-local";
  const messageId = typeof data.messageId === "string" ? data.messageId : "";
  if (conversationId && getActiveChatConversation() === conversationId) {
    return true;
  }

  // SignalR claimed this message before scheduling the local notification.
  // Do not claim it again here or Expo will suppress the notification itself.
  if (isClaimedSignalrNotification) return false;

  const dedupeKey = messageId || `${conversationId}:${String(data.createdAt ?? "")}`;
  if (!dedupeKey) return false;

  const shouldShow = claimChatNotification(dedupeKey);
  if (!shouldShow) {
    console.info("[ChatSync] message deduped", {
      conversationId,
      messageId,
      source: "fcm",
      timestamp: new Date().toISOString(),
    });
  }
  return !shouldShow;
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

const getTokenSuffix = (token: string) => token.slice(-8);

const getCachedFcmToken = async () => {
  const token = await SecureStore.getItemAsync(LAST_FCM_TOKEN_KEY);
  return token?.trim() ? token : null;
};

const setCachedFcmToken = async (token: string) => {
  if (!token.trim()) return;
  await SecureStore.setItemAsync(LAST_FCM_TOKEN_KEY, token);
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getFirebaseMessagingTokenWithRetry = async () => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= DEVICE_PUSH_TOKEN_MAX_ATTEMPTS; attempt += 1) {
    try {
      console.info("[Push] fetching FCM token", { attempt });
      if (Platform.OS === "ios") {
        await registerDeviceForRemoteMessages(messagingInstance);
      }
      const token = await getToken(messagingInstance);
      return token;
    } catch (error) {
      lastError = error;
      console.info("[Push] FCM token fetch failed", {
        attempt,
        message: error instanceof Error ? error.message : String(error),
      });

      if (attempt < DEVICE_PUSH_TOKEN_MAX_ATTEMPTS) {
        await delay(DEVICE_PUSH_TOKEN_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Không thể lấy FCM token."));
};

const getExpoNativeTokenWithRetry = async () => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= DEVICE_PUSH_TOKEN_MAX_ATTEMPTS; attempt += 1) {
    try {
      console.info("[Push] fetching Expo native token", { attempt });
      const token = await Notifications.getDevicePushTokenAsync();
      if (token.type !== Platform.OS) {
        throw new Error(`Expected ${Platform.OS} push token, got ${token.type}.`);
      }
      if (typeof token.data !== "string" || !token.data.trim()) {
        throw new Error("Expo returned an empty native push token.");
      }
      return token.data;
    } catch (error) {
      lastError = error;
      console.info("[Push] Expo native token fetch failed", {
        attempt,
        message: error instanceof Error ? error.message : String(error),
      });
      if (attempt < DEVICE_PUSH_TOKEN_MAX_ATTEMPTS) {
        await delay(DEVICE_PUSH_TOKEN_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Cannot get native push token."));
};

const getNativePushTokenWithRetry = () =>
  Platform.OS === "android"
    ? getExpoNativeTokenWithRetry()
    : getFirebaseMessagingTokenWithRetry();

const getCachedFcmTokenForUnregister = async () => {
  const cachedToken = await getCachedFcmToken();
  if (cachedToken) {
    console.info("[Push] using cached FCM token", {
      tokenLength: cachedToken.length,
      tokenSuffix: getTokenSuffix(cachedToken),
    });
    return cachedToken;
  }

  throw new Error("Cannot get cached FCM token.");
};

const logNotificationLifecycle = (
  eventName: string,
  data: Record<string, unknown>,
) => {
  console.info(`[Push] ${eventName}`, {
    conversationId: data.conversationId,
    notificationId: data.notificationId ?? data.id,
    postId: data.postId,
    reelId: data.reelId ?? data.videoId,
    referenceId: data.referenceId,
    type: data.type,
  });
};

const getRemoteMessageData = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
) => (remoteMessage?.data ?? {}) as Record<string, unknown>;

const handleRemoteMessageNavigation = (
  eventName: string,
  remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
) => {
  if (!remoteMessage) return;
  const data = getRemoteMessageData(remoteMessage);
  const responseKey = String(
    remoteMessage.messageId ?? data.messageId ?? data.notificationId ?? "",
  );
  if (!claimNotificationResponse(responseKey)) return;
  logNotificationLifecycle(eventName, data);
  if (data.type === "MissedCall") {
    emitCallLifecycle("CallMissed", data);
  }
  navigateNotificationData(data);
};

const registerPushNotificationsInternal = async () => {
  try {
    console.info("[Push] registration starting", {
      appOwnership: Constants.appOwnership,
      firebaseProjectId: Constants.expoConfig?.extra?.firebaseProjectId,
      googleServicesProjectId: Constants.expoConfig?.extra?.firebaseProjectId,
      isDevice: Device.isDevice,
      packageName: Constants.expoConfig?.android?.package,
      platform: Platform.OS,
    });

    try {
      const firebaseApp = getApp();
      console.info("[Push] Firebase native app options", {
        appId: firebaseApp.options.appId,
        messagingSenderId: firebaseApp.options.messagingSenderId,
        projectId: firebaseApp.options.projectId,
      });
    } catch (error) {
      console.info(
        "[Push] Firebase native app options unavailable",
        error instanceof Error ? error.message : String(error),
      );
    }

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

    const pushToken = await getNativePushTokenWithRetry();
    console.info("[Push] FCM token received", {
      tokenLength: pushToken.length,
      tokenSuffix: getTokenSuffix(pushToken),
    });

    await registerNativeDevicePushToken(pushToken, "initial");
    await setCachedFcmToken(pushToken);

    return pushToken;
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

const registerNativeDevicePushToken = async (
  token: string,
  reason: "initial" | "refresh",
) => {
  if (!token.trim()) {
    console.info("[Push] registration skipped: empty native token", { reason });
    return null;
  }

  const existingRegistration = nativeTokenRegistrationPromises.get(token);
  if (existingRegistration) {
    console.info("[Push] token registration deduped", {
      reason,
      tokenSuffix: token.slice(-8),
    });
    return existingRegistration;
  }

  const registration = registerNativeDevicePushTokenInternal(token, reason);
  nativeTokenRegistrationPromises.set(token, registration);
  return registration.finally(() => {
    if (nativeTokenRegistrationPromises.get(token) === registration) {
      nativeTokenRegistrationPromises.delete(token);
    }
  });
};

const registerNativeDevicePushTokenInternal = async (
  token: string,
  reason: "initial" | "refresh",
) => {

  const deviceId = await getDeviceId();
  console.info("[Push] registering native token", {
    deviceId,
    reason,
    tokenLength: token.length,
    tokenSuffix: getTokenSuffix(token),
  });

  const result = await registerDeviceToken({
    appVersion: Constants.expoConfig?.version ?? "1.0.0",
    deviceId,
    deviceName: Device.deviceName ?? Device.modelName ?? Platform.OS,
    token,
  });

  console.info("[Push] Device token registered", {
    isActive: result.isActive,
    reason,
    success: result.success,
  });

  return result;
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

  onMessage(messagingInstance, async (remoteMessage) => {
    const data = getRemoteMessageData(remoteMessage);
    console.info("[FCM foreground] message received", {
      conversationId: data.conversationId,
      data,
      messageId: remoteMessage.messageId ?? data.messageId,
      notification: remoteMessage.notification
        ? {
            body: remoteMessage.notification.body,
            title: remoteMessage.notification.title,
          }
        : null,
      source: "fcm",
      timestamp: new Date().toISOString(),
    });
    if (data.type === "IncomingCall") {
      emitIncomingCall(data);
      return;
    }
    if (data.type === "MissedCall") {
      emitCallLifecycle("CallMissed", data);
      return;
    }
    if (data.type === "chat") void syncChatUnreadCount("fcm-foreground");
  });

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
    logNotificationLifecycle("foreground notification received", data);
      if (data.type === "IncomingCall") {
        emitIncomingCall(data);
      } else if (data.type === "MissedCall") {
        emitCallLifecycle("CallMissed", data);
      }
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

export const setupPushTokenRefreshHandling = () => {
  if (pushTokenRefreshHandlingConfigured) return;

  if (Platform.OS === "android") {
    Notifications.addPushTokenListener((nativeToken) => {
      if (
        nativeToken.type !== "android" ||
        typeof nativeToken.data !== "string" ||
        !nativeToken.data.trim()
      ) {
        return;
      }
      const token = nativeToken.data;
      console.info("[FCM token refresh] Expo native token refreshed", {
        tokenLength: token.length,
        tokenSuffix: getTokenSuffix(token),
      });
      void registerNativeDevicePushToken(token, "refresh")
        .then(() => setCachedFcmToken(token))
        .catch((error) => {
          console.info(
            "[Push] token refresh registration failed",
            error instanceof Error ? error.message : String(error),
          );
        });
    });
    pushTokenRefreshHandlingConfigured = true;
    return;
  }

  onTokenRefresh(messagingInstance, (token) => {
    console.info("[FCM token refresh] token refreshed", {
      tokenLength: token.length,
      tokenSuffix: getTokenSuffix(token),
    });
    void registerNativeDevicePushToken(token, "refresh")
      .then(() => setCachedFcmToken(token))
      .catch((error) => {
        console.info(
          "[Push] token refresh registration failed",
          error instanceof Error ? error.message : String(error),
        );
      });
  });

  pushTokenRefreshHandlingConfigured = true;
};

export const unregisterCurrentDevicePushToken = async () => {
  if (Platform.OS === "web" || !Device.isDevice) return;

  try {
    const pushToken = await getCachedFcmTokenForUnregister();
    if (!pushToken.trim()) return;
    console.info("[Push] unregistering native token", {
      tokenLength: pushToken.length,
      tokenSuffix: getTokenSuffix(pushToken),
    });
    await unregisterDeviceToken(pushToken);
  } catch (error) {
    console.info(
      "[Push] unregister skipped",
      error instanceof Error ? error.message : String(error),
    );
  }
};

export const setupNotificationResponseHandling = () => {
  if (notificationResponseHandlingConfigured) return;

  onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
    console.info("[FCM opened]", {
      data: getRemoteMessageData(remoteMessage),
      messageId: remoteMessage.messageId,
      timestamp: new Date().toISOString(),
    });
    handleRemoteMessageNavigation("messaging onNotificationOpenedApp", remoteMessage);
  });

  void getInitialNotification(messagingInstance)
    .then((remoteMessage) => {
      console.info("[FCM initial]", {
        data: getRemoteMessageData(remoteMessage),
        messageId: remoteMessage?.messageId ?? null,
        received: remoteMessage !== null,
        timestamp: new Date().toISOString(),
      });
      handleRemoteMessageNavigation("messaging getInitialNotification", remoteMessage);
    })
    .catch((error: unknown) => {
      console.info(
        "[Push] messaging getInitialNotification failed",
        error instanceof Error ? error.message : String(error),
      );
    });

  const handleResponse = (response: Notifications.NotificationResponse) => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }

    const data = response.notification.request.content.data as Record<
      string,
      unknown
    >;
    const responseKey = String(
      data.messageId ??
        data.notificationId ??
        response.notification.request.identifier,
    );
    if (!claimNotificationResponse(responseKey)) return;
    logNotificationLifecycle("notification opened", data);
    if (data.type === "MissedCall") {
      emitCallLifecycle("CallMissed", data);
    }
    const didNavigate = navigateNotificationData(data);
    if (didNavigate) {
      void Notifications.clearLastNotificationResponseAsync();
    }
  };

  Notifications.addNotificationResponseReceivedListener((response) => {
    handleResponse(response);
  });

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    logNotificationLifecycle(
      "initial notification",
      response.notification.request.content.data as Record<string, unknown>,
    );
    handleResponse(response);
  });

  notificationResponseHandlingConfigured = true;
};
