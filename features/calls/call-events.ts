import { CallType, type CallEndedEvent, type IncomingCallEvent } from "@/types/call";

type IncomingCallListener = (event: IncomingCallEvent) => void;
type CallLifecycleListener = (event: CallEndedEvent & { eventName: string }) => void;
type CallAcceptedListener = (payload: unknown) => void;
export type ActiveVoiceCall = {
  avatarUrl: string | null;
  callId: string;
  conversationId: string;
  displayName: string;
  callType: CallType;
  mode: "caller" | "receiver";
  peer?: { close: () => void };
  connectedAtMs?: number;
  status: "calling" | "connecting" | "active";
};
type ActiveVoiceCallListener = (call: ActiveVoiceCall | null) => void;

const incomingCallListeners = new Set<IncomingCallListener>();
const lifecycleListeners = new Set<CallLifecycleListener>();
const acceptedListeners = new Set<CallAcceptedListener>();
const activeVoiceCallListeners = new Set<ActiveVoiceCallListener>();
let pendingIncomingCall: IncomingCallEvent | null = null;
let activeVoiceCall: ActiveVoiceCall | null = null;
const endedCallIds = new Set<string>();

const rememberEndedCall = (callId: string) => {
  endedCallIds.add(callId);
  if (endedCallIds.size <= 100) return;
  const oldestCallId = endedCallIds.values().next().value;
  if (oldestCallId) endedCallIds.delete(oldestCallId);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asCallType = (value: unknown) => {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : CallType.Audio;
  return numeric === CallType.Video ? CallType.Video : CallType.Audio;
};

export const subscribeIncomingCalls = (listener: IncomingCallListener) => {
  incomingCallListeners.add(listener);
  if (pendingIncomingCall) listener(pendingIncomingCall);
  return () => {
    incomingCallListeners.delete(listener);
  };
};

export const subscribeCallAccepted = (listener: CallAcceptedListener) => {
  acceptedListeners.add(listener);
  return () => {
    acceptedListeners.delete(listener);
  };
};

export const subscribeCallLifecycle = (listener: CallLifecycleListener) => {
  lifecycleListeners.add(listener);
  return () => {
    lifecycleListeners.delete(listener);
  };
};

export const getActiveVoiceCall = () => activeVoiceCall;

export const setActiveVoiceCall = (call: ActiveVoiceCall) => {
  if (endedCallIds.has(call.callId)) return;
  activeVoiceCall = call;
  activeVoiceCallListeners.forEach((listener) => listener(call));
};

export const clearActiveVoiceCall = (callId?: string, closePeer = false) => {
  if (callId) rememberEndedCall(callId);
  if (!callId || activeVoiceCall?.callId === callId) {
    if (closePeer) activeVoiceCall?.peer?.close();
    activeVoiceCall = null;
    activeVoiceCallListeners.forEach((listener) => listener(null));
  }
};

export const subscribeActiveVoiceCall = (listener: ActiveVoiceCallListener) => {
  activeVoiceCallListeners.add(listener);
  listener(activeVoiceCall);
  return () => {
    activeVoiceCallListeners.delete(listener);
  };
};

export const emitIncomingCall = (payload: unknown) => {
  if (!isRecord(payload)) return null;
  const callId = asString(payload.callId);
  const conversationId = asString(payload.conversationId);
  const caller = isRecord(payload.caller) ? payload.caller : null;
  const callerId = caller
    ? asString(caller.id)
    : asString(payload.callerId ?? payload["caller.id"]);
  if (!callId || !conversationId || !callerId) return null;
  if (
    endedCallIds.has(callId) ||
    activeVoiceCall?.callId === callId
  ) {
    return null;
  }
  if (pendingIncomingCall?.callId === callId) return pendingIncomingCall;
  const event: IncomingCallEvent = {
    callId,
    conversationId,
    callType: asCallType(payload.callType),
    isGroupCall:
      payload.isGroupCall === true ||
      payload.isGroupCall === "true" ||
      asString(payload.type).toLowerCase() === "groupcall",
    caller: {
      avatarUrl: caller
        ? asString(caller.avatarUrl) || null
        : asString(payload.callerAvatarUrl ?? payload["caller.avatarUrl"]) || null,
      displayName: caller
        ? asString(caller.displayName, "Người gọi")
        : asString(payload.callerDisplayName ?? payload["caller.displayName"], "Người gọi"),
      id: callerId,
    },
  };
  pendingIncomingCall = event;
  incomingCallListeners.forEach((listener) => listener(event));
  return event;
};

export const clearIncomingCall = (callId?: string) => {
  if (!callId || pendingIncomingCall?.callId === callId) {
    pendingIncomingCall = null;
  }
};

export const emitCallAccepted = (payload: unknown) => {
  acceptedListeners.forEach((listener) => listener(payload));
};

export const emitCallLifecycle = (eventName: string, payload: unknown) => {
  if (!isRecord(payload)) return null;
  const callId = asString(payload.callId);
  const conversationId = asString(payload.conversationId);
  if (!callId || !conversationId) return null;
  const event = {
    callId,
    conversationId,
    duration: typeof payload.duration === "number" ? payload.duration : null,
    eventName,
    status: typeof payload.status === "number" ? payload.status : 0,
  };
  clearIncomingCall(callId);
  clearActiveVoiceCall(callId, true);
  lifecycleListeners.forEach((listener) => listener(event));
  return event;
};
