import { INCOMING_CALL_CHANNEL_ID } from "@/features/calls/call-waiting";
export { INCOMING_CALL_CHANNEL_ID };
export const INCOMING_CALL_CATEGORY_ID = "incoming_calls";
export const INCOMING_CALL_OPEN_ACTION = "incoming_call_open";
export const INCOMING_CALL_ACCEPT_ACTION = "incoming_call_accept";
export const INCOMING_CALL_REJECT_ACTION = "incoming_call_reject";
export const INCOMING_CALL_LOCAL_SOURCE = "incoming-call-local";
const notifications = new Map<string, Notification>();
let originalTitle: string | null = null;

const restoreTitle = () => {
  if (typeof document === "undefined" || originalTitle === null) return;
  document.title = originalTitle;
  originalTitle = null;
};

export const dismissIncomingCallNotification = async (
  callId: string,
): Promise<void> => {
  notifications.get(callId)?.close();
  notifications.delete(callId);
  if (notifications.size === 0) restoreTitle();
};

export const ensureIncomingCallNotificationChannel = async (): Promise<void> =>
  undefined;

export const scheduleIncomingCallNotification = async (
  {
    body,
    data,
    title,
  }: {
    body?: string;
    data: Record<string, unknown>;
    title?: string;
  },
): Promise<void> => {
  if (typeof document === "undefined" || document.visibilityState !== "hidden") return;
  const callId = typeof data.callId === "string" ? data.callId : "";
  if (!callId) return;

  originalTitle ??= document.title;
  document.title = `Cuộc gọi đến · ${title || "ANKT"}`;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const previousNotification = notifications.get(callId);
  notifications.delete(callId);
  previousNotification?.close();
  const notification = new Notification(title || "ANKT", {
    body: body || "Đang gọi cho bạn",
    icon: "/favicon.ico",
    requireInteraction: true,
    tag: `incoming-call-${callId}`,
  });
  notification.onclick = () => {
    window.focus();
    window.location.assign(`/incoming-call/${encodeURIComponent(callId)}`);
    notification.close();
  };
  notification.onclose = () => {
    if (notifications.get(callId) !== notification) return;
    notifications.delete(callId);
    if (notifications.size === 0) restoreTitle();
  };
  notifications.set(callId, notification);
};

export const replaceDelegatedIncomingCallNotification = async (
  args: Parameters<typeof scheduleIncomingCallNotification>[0],
): Promise<void> => scheduleIncomingCallNotification(args);
