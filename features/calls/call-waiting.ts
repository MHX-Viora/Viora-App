export const CALL_ANSWER_TIMEOUT_MS = 30_000;
export const INCOMING_CALL_RINGTONE_ANDROID = "nhac_chuong";
export const INCOMING_CALL_RINGTONE_FILE = "nhac_chuong.mp3";
export const INCOMING_CALL_VIBRATION_PATTERN = [500, 250, 500, 250, 900, 250];
export const OUTGOING_RINGBACK_FILE = "nhac_cho.mp3";
export const OUTGOING_RINGBACK_VOLUME = 1;

const CALL_LIFECYCLE_NOTIFICATION_TYPES = new Set([
  "CallRejected",
  "CallCancelled",
  "CallEnded",
  "CallMissed",
  "CallTimeout",
]);

export const isCallLifecycleNotificationType = (value: unknown) =>
  typeof value === "string" && CALL_LIFECYCLE_NOTIFICATION_TYPES.has(value);

export const getIncomingCallNotificationId = (callId: string) =>
  callId ? `incoming-call-${callId}` : "";

export const shouldNavigateAwayFromCall = (
  isScreenMounted: boolean,
  hasNavigated: boolean,
) => isScreenMounted && !hasNavigated;

export const shouldUseFullScreenCallAction = (appState: string) =>
  appState !== "active";

export const isWaitingForAnswer = (
  mode: "caller" | "receiver",
  status: "calling" | "connecting" | "active" | "ending" | "ended",
) => mode === "caller" && status === "calling";
