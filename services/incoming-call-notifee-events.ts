import notifee, { EventType, type Event } from "@notifee/react-native";

import { emitCallLifecycle } from "@/features/calls/call-events";
import { navigateNotificationData } from "@/features/notifications/notification-response-navigation";
import { rejectVoiceCall } from "@/services/call.service";
import {
  INCOMING_CALL_ACCEPT_ACTION,
  INCOMING_CALL_REJECT_ACTION,
} from "@/services/incoming-call-notification.service";

let foregroundEventsConfigured = false;

const handleIncomingCallEvent = async ({ detail, type }: Event) => {
  if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return;

  const data = detail.notification?.data as
    | Record<string, unknown>
    | undefined;
  if (!data) return;

  const actionId = detail.pressAction?.id;
  const callId = typeof data.callId === "string" ? data.callId : "";

  if (actionId === INCOMING_CALL_REJECT_ACTION) {
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
    if (!callId) return;
    if (data.type === "GroupCall") {
      emitCallLifecycle("GroupCallDeclined", data);
      return;
    }
    try {
      await rejectVoiceCall(callId);
      emitCallLifecycle("CallRejected", data);
    } catch (error) {
      console.info(
        "[CallNotification] reject failed",
        error instanceof Error ? error.message : String(error),
      );
    }
    return;
  }

  if (actionId === INCOMING_CALL_ACCEPT_ACTION || type === EventType.PRESS) {
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
    emitCallLifecycle("CallAcceptedLocally", data);
    navigateNotificationData(data);
  }
};

notifee.onBackgroundEvent(handleIncomingCallEvent);

export const setupIncomingCallNotifeeEvents = () => {
  if (foregroundEventsConfigured) return;

  notifee.onForegroundEvent((event) => {
    void handleIncomingCallEvent(event);
  });

  void notifee.getInitialNotification().then((initialNotification) => {
    if (!initialNotification) return;
    void handleIncomingCallEvent({
      detail: {
        notification: initialNotification.notification,
        pressAction: initialNotification.pressAction,
      },
      type: EventType.PRESS,
    });
  });

  foregroundEventsConfigured = true;
};
