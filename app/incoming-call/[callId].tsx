import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { navigateNotificationData } from "@/features/notifications/notification-response-navigation";

export default function IncomingCallRoute() {
  const { callId } = useLocalSearchParams<{ callId?: string }>();

  useEffect(() => {
    if (callId) navigateNotificationData({ callId, type: "IncomingCall" });
    router.replace("/");
  }, [callId]);

  return null;
}
