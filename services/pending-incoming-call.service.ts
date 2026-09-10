import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { CALL_ANSWER_TIMEOUT_MS } from "@/features/calls/call-waiting";

const PENDING_INCOMING_CALL_KEY = "viora.pending-incoming-call";

export type PendingIncomingCallData = {
  callId: string;
  callType: string;
  callerAvatarUrl: string;
  callerDisplayName: string;
  callerId: string;
  conversationId: string;
  receivedAt: number;
  type: "IncomingCall";
};

const storage = Platform.OS === "web"
  ? {
      async deleteItemAsync(key: string) {
        if (typeof window !== "undefined") window.sessionStorage.removeItem(key);
      },
      async getItemAsync(key: string) {
        return typeof window === "undefined"
          ? null
          : window.sessionStorage.getItem(key);
      },
      async setItemAsync(key: string, value: string) {
        if (typeof window !== "undefined") window.sessionStorage.setItem(key, value);
      },
    }
  : SecureStore;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const normalizeCallType = (value: unknown) => {
  if (value === 1 || value === "1") return "1";
  if (typeof value === "string" && value.toLowerCase() === "video") return "1";
  return "0";
};

const normalizePendingIncomingCall = (
  value: Record<string, unknown>,
  receivedAt = Date.now(),
): PendingIncomingCallData | null => {
  const type = firstString(value.type, value.notificationType);
  const callId = firstString(value.callId, value["call.id"]);
  const conversationId = firstString(
    value.conversationId,
    value["conversation.id"],
  );
  const callerId = firstString(
    isRecord(value.caller) ? value.caller.id : null,
    value.callerId,
    value["caller.id"],
  );
  if (type.toLowerCase() !== "incomingcall") return null;
  if (!callId || !conversationId || !callerId) return null;

  return {
    callId,
    callType: normalizeCallType(value.callType),
    callerAvatarUrl: firstString(
      isRecord(value.caller) ? value.caller.avatarUrl : null,
      value.callerAvatarUrl,
      value.callerAvatar,
      value["caller.avatarUrl"],
    ),
    callerDisplayName: firstString(
      isRecord(value.caller) ? value.caller.displayName : null,
      value.callerDisplayName,
      value.callerName,
      value["caller.displayName"],
    ) || "Người gọi",
    callerId,
    conversationId,
    receivedAt,
    type: "IncomingCall",
  };
};

const parseStoredPendingIncomingCall = (
  stored: string,
): PendingIncomingCallData | null => {
  try {
    const value: unknown = JSON.parse(stored);
    if (!isRecord(value) || typeof value.receivedAt !== "number") return null;
    return normalizePendingIncomingCall(value, value.receivedAt);
  } catch {
    return null;
  }
};

export const savePendingIncomingCall = async (
  data: Record<string, unknown>,
): Promise<boolean> => {
  const pendingCall = normalizePendingIncomingCall(data);
  if (!pendingCall) return false;

  await storage.setItemAsync(
    PENDING_INCOMING_CALL_KEY,
    JSON.stringify(pendingCall),
  );
  return true;
};

export const getPendingIncomingCall = async () => {
  const stored = await storage.getItemAsync(PENDING_INCOMING_CALL_KEY);
  if (!stored) return null;

  const pendingCall = parseStoredPendingIncomingCall(stored);
  if (
    !pendingCall ||
    Date.now() - pendingCall.receivedAt > CALL_ANSWER_TIMEOUT_MS
  ) {
    await storage.deleteItemAsync(PENDING_INCOMING_CALL_KEY);
    return null;
  }

  return pendingCall;
};

export const clearPendingIncomingCall = async (callId?: string) => {
  if (!callId) {
    await storage.deleteItemAsync(PENDING_INCOMING_CALL_KEY);
    return;
  }

  const stored = await storage.getItemAsync(PENDING_INCOMING_CALL_KEY);
  if (!stored) return;
  const pendingCall = parseStoredPendingIncomingCall(stored);
  if (!pendingCall || pendingCall.callId === callId) {
    await storage.deleteItemAsync(PENDING_INCOMING_CALL_KEY);
  }
};
