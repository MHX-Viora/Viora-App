import { router } from "expo-router";

import { emitIncomingCall } from "@/features/calls/call-events";
import { navigateNotification } from "@/features/notifications/notification-navigation";
import { getVoiceCall } from "@/services/call.service";
import {
  clearPendingIncomingCall,
  getPendingIncomingCall,
} from "@/services/pending-incoming-call.service";
import { CallStatus } from "@/types/call";
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
  Number.isInteger(value) && value >= 0 && value <= 6;

let navigationReady = false;
const pendingNavigationActions: (() => void)[] = [];
const incomingCallValidations = new Map<string, Promise<boolean>>();
const restoredPendingCallIds = new Set<string>();

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

const validateIncomingCall = (
  data: Record<string, unknown>,
  action: "answer" | "show",
) => {
  const callId = firstString(data.callId, data["call.id"]);
  if (!callId) return Promise.resolve(false);

  const validationKey = `${callId}:${action}`;
  const existingValidation = incomingCallValidations.get(validationKey);
  if (existingValidation) return existingValidation;

  const validation = getVoiceCall(callId)
    .then(async (call) => {
      if (call.status !== CallStatus.Calling) {
        await clearPendingIncomingCall(callId);
        return false;
      }

      if (action === "answer") {
        await clearPendingIncomingCall(callId);
        router.push({
          pathname: "/call/[callId]",
          params: {
            avatarUrl: call.caller.avatarUrl ?? "",
            callId: call.id,
            callType: String(call.callType),
            conversationId: call.conversationId,
            displayName: call.caller.displayName,
            mode: "receiver",
          },
        });
        return true;
      }

      return emitIncomingCall({
        callId: call.id,
        caller: call.caller,
        callType: call.callType,
        conversationId: call.conversationId,
        type: "IncomingCall",
      }) !== null;
    })
    .catch((error) => {
      console.info(
        "[Push] incoming call lookup skipped",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    })
    .finally(() => {
      incomingCallValidations.delete(validationKey);
    });

  incomingCallValidations.set(validationKey, validation);
  return validation;
};

export const navigateIncomingCallAnswerData = (
  data: Record<string, unknown>,
) => {
  const callId = firstString(data.callId, data["call.id"]);
  if (!callId) return false;
  navigateWhenReady(() => {
    void validateIncomingCall(data, "answer");
  });
  return true;
};

export const restorePendingIncomingCall = async () => {
  const pendingCall = await getPendingIncomingCall();
  if (!pendingCall) return false;
  if (restoredPendingCallIds.has(pendingCall.callId)) return true;

  const restored = await validateIncomingCall(pendingCall, "show");
  if (restored) restoredPendingCallIds.add(pendingCall.callId);
  return restored;
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
  if (dataType?.toLowerCase() === "incomingcall") {
    const callId = firstString(data.callId, data["call.id"]);
    if (callId) {
      navigateWhenReady(() => {
        void validateIncomingCall(data, "show");
      });
      return true;
    }
  }
  if (dataType?.toLowerCase() === "groupcall") {
    const callId = firstString(data.callId, data["call.id"]);
    if (callId) {
      navigateWhenReady(() =>
        router.push({
          pathname: "/group-call/[callId]",
          params: { callId },
        }),
      );
      return true;
    }
  }
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
