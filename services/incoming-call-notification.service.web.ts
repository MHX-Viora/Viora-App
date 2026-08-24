import { INCOMING_CALL_CHANNEL_ID } from "@/features/calls/call-waiting";
export { INCOMING_CALL_CHANNEL_ID };
export const INCOMING_CALL_CATEGORY_ID = "incoming_calls";
export const INCOMING_CALL_OPEN_ACTION = "incoming_call_open";
export const INCOMING_CALL_ACCEPT_ACTION = "incoming_call_accept";
export const INCOMING_CALL_REJECT_ACTION = "incoming_call_reject";
export const INCOMING_CALL_LOCAL_SOURCE = "incoming-call-local";

export const dismissIncomingCallNotification = async (
  _callId: string,
): Promise<void> => undefined;

export const ensureIncomingCallNotificationChannel = async (): Promise<void> =>
  undefined;

export const scheduleIncomingCallNotification = async (
  ..._args: unknown[]
): Promise<void> => undefined;

export const replaceDelegatedIncomingCallNotification = async (
  ..._args: unknown[]
): Promise<void> => undefined;
