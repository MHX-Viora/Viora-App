import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";

import { emitCallLifecycle, emitIncomingCall } from "@/features/calls/call-events";
import { isCallLifecycleNotificationType } from "@/features/calls/call-waiting";
import { registerDeviceToken, unregisterDeviceToken } from "@/services/device-token.service";
import { scheduleIncomingCallNotification } from "@/services/incoming-call-notification.service.web";
import { isAcceptedOnCurrentRealtimeConnection } from "@/services/realtime.service";
import {
  clearPendingIncomingCall,
  savePendingIncomingCall,
} from "@/services/pending-incoming-call.service";
import { registerAnktServiceWorker } from "@/services/pwa.service.web";

const DEVICE_ID_KEY = "ankt.web-push-device-id";
const TOKEN_KEY = "ankt.web-push-token";
let messaging: Messaging | null = null;
let unsubscribeForeground: (() => void) | null = null;

const firebaseOptions = (): FirebaseOptions | null => {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_WEB_API_KEY?.trim();
  const appId = process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID?.trim();
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN?.trim();
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_WEB_MESSAGING_SENDER_ID?.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID?.trim();
  if (!apiKey || !appId || !messagingSenderId || !projectId) return null;
  return { apiKey, appId, authDomain, messagingSenderId, projectId };
};

const getWebMessaging = async () => {
  if (messaging) return messaging;
  const options = firebaseOptions();
  if (!options || !(await isSupported())) return null;
  const app = getApps().length > 0 ? getApp() : initializeApp(options);
  messaging = getMessaging(app);
  return messaging;
};

const getDeviceId = () => {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
};

const handleForegroundMessage = (data: Record<string, unknown>) => {
  const type = typeof data.type === "string" ? data.type : "";
  const callId = typeof data.callId === "string" ? data.callId : "";
  if (type === "IncomingCall") {
    void savePendingIncomingCall(data);
    const event = emitIncomingCall(data);
    if (event) {
      void scheduleIncomingCallNotification({
        body: typeof data.body === "string" ? data.body : "Đang gọi cho bạn",
        data,
        title: event.caller.displayName,
      });
    }
    return;
  }
  if (callId && isCallLifecycleNotificationType(type)) {
    if (type === "CallAnsweredElsewhere" && isAcceptedOnCurrentRealtimeConnection(data)) return;
    void clearPendingIncomingCall(callId);
    emitCallLifecycle(type, data);
  }
};

export const registerPushNotifications = async (): Promise<string | null> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (typeof Notification === "undefined") return null;
  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== "granted") return null;

  const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_WEB_VAPID_KEY?.trim();
  const options = firebaseOptions();
  const nextMessaging = await getWebMessaging();
  if (!vapidKey || !options || !nextMessaging) return null;
  const serviceWorkerRegistration = await registerAnktServiceWorker(options);
  if (!serviceWorkerRegistration) return null;
  const token = await getToken(nextMessaging, { serviceWorkerRegistration, vapidKey });
  if (!token) return null;
  window.localStorage.setItem(TOKEN_KEY, token);
  await registerDeviceToken({
    appVersion: "web",
    deviceId: getDeviceId(),
    deviceName: navigator.userAgent.slice(0, 255),
    token,
  });
  return token;
};

export const setupNotificationHandling = () => {
  if (unsubscribeForeground || typeof window === "undefined") return;
  void getWebMessaging().then((nextMessaging) => {
    if (!nextMessaging || unsubscribeForeground) return;
    unsubscribeForeground = onMessage(nextMessaging, (payload) => {
      handleForegroundMessage((payload.data ?? {}) as Record<string, unknown>);
    });
  });
};

export const setupNotificationResponseHandling = () => undefined;

export const setupPushTokenRefreshHandling = () => undefined;

export const unregisterCurrentDevicePushToken = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) await unregisterDeviceToken(token).catch(() => undefined);
  const nextMessaging = await getWebMessaging();
  if (nextMessaging) await deleteToken(nextMessaging).catch(() => false);
  window.localStorage.removeItem(TOKEN_KEY);
};
