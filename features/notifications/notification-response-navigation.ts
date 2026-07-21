import { router } from "expo-router";

import { navigateNotification } from "@/features/notifications/notification-navigation";
import type {
  NotificationItemModel,
  NotificationReferenceType,
} from "@/types/notification";

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return NaN;
};

const toString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    const text = toString(value);
    if (text) return text;
  }

  return null;
};

const firstNumber = (...values: unknown[]) => {
  for (const value of values) {
    const number = toNumber(value);
    if (Number.isFinite(number)) return number;
  }

  return NaN;
};

const isReferenceType = (value: number): value is NotificationReferenceType =>
  Number.isInteger(value) && value >= 0 && value <= 5;

let navigationReady = false;
const pendingNavigationActions: (() => void)[] = [];

const navigateWhenReady = (navigate: () => void) => {
  if (!navigationReady) {
    pendingNavigationActions.push(navigate);
    return;
  }

  setTimeout(navigate, 0);
};

export const setNotificationNavigationReady = (ready: boolean) => {
  navigationReady = ready;
  if (!ready) return;

  const actions = pendingNavigationActions.splice(0);
  actions.forEach((navigate) => setTimeout(navigate, 0));
};

const navigateContentData = (data: Record<string, unknown>) => {
  const dataType = firstString(data.type, data.notificationType)?.toLowerCase();
  const postId = firstString(data.postId, data["post.id"]);
  const referenceId = firstString(data.referenceId, data["reference.id"]);
  if (postId || (dataType === "post" && referenceId)) {
    navigateWhenReady(() =>
      router.push({
        pathname: "/post/[postId]",
        params: { postId: postId ?? referenceId ?? "" },
      }),
    );
    return true;
  }

  const reelId = firstString(data.reelId, data["reel.id"], data.videoId);
  if (
    reelId ||
    ((dataType === "reel" || dataType === "video") && referenceId)
  ) {
    navigateWhenReady(() =>
      router.push({
        pathname: "/reel/[reelId]",
        params: { reelId: reelId ?? referenceId ?? "" },
      }),
    );
    return true;
  }

  return false;
};

export const navigateNotificationData = (data: Record<string, unknown>) => {
  console.info("[Push] notification response data", data);

  if (navigateContentData(data)) {
    return true;
  }

  const chatConversationId = firstString(
    data.conversationId,
    data["conversation.id"],
  );
  const dataType = firstString(data.type, data.notificationType);
  if (dataType === "chat" && chatConversationId) {
    navigateWhenReady(() =>
      router.push({
        pathname: "/chat/[conversationId]",
        params: { conversationId: chatConversationId },
      }),
    );
    return true;
  }

  const notificationId = firstString(data.notificationId, data.id);
  const notificationType = firstNumber(data.notificationType, data.type);
  const referenceId = firstString(data.referenceId, data["reference.id"]);
  const referenceType = firstNumber(data.referenceType, data["reference.type"]);

  if (!notificationId && !referenceId) {
    return false;
  }

  const notification: NotificationItemModel = {
    content: "",
    createdAt: new Date().toISOString(),
    id: notificationId ?? `push-${referenceId}`,
    imageUrl: null,
    isRead: false,
    reference:
      referenceId && isReferenceType(referenceType)
        ? { id: referenceId, type: referenceType }
        : null,
    sender: null,
    title: "",
    type: Number.isFinite(notificationType) ? notificationType : 0,
  };

  if (!notification.reference) {
    navigateWhenReady(() => router.push("/notification"));
    return true;
  }

  navigateWhenReady(() => navigateNotification(notification, router));
  return true;
};
