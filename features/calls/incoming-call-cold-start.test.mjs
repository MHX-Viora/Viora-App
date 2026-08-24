import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const appLayout = read("../../app/_layout.tsx");
const backgroundMessaging = read("../../services/firebase-background-messaging.ts");
const callEvents = read("./call-events.ts");
const notifeeEvents = read("../../services/incoming-call-notifee-events.ts");
const notificationNavigation = read(
  "../notifications/notification-response-navigation.ts",
);
const notificationService = read(
  "../../services/incoming-call-notification.service.ts",
);
const pendingCallService = read(
  "../../services/pending-incoming-call.service.ts",
);

test("background delivery persists the call and keeps lifecycle cleanup", () => {
  assert.match(pendingCallService, /viora\.pending-incoming-call/);
  assert.match(
    backgroundMessaging,
    /savePendingIncomingCall\(notificationData\)[\s\S]*Platform\.OS === "android"[\s\S]*return;[\s\S]*replaceDelegatedIncomingCallNotification/,
  );
  assert.match(
    backgroundMessaging,
    /isCallLifecycleNotificationType[\s\S]*clearPendingIncomingCall\(callId\)/,
  );
});

test("authenticated bootstrap restores the pending call before navigation becomes ready", () => {
  assert.match(
    appLayout,
    /await restorePendingIncomingCall\(\);\s*setNotificationNavigationReady\(true\);/,
  );
  assert.match(
    notificationNavigation,
    /callType:\s*call\.callType/,
  );
});

test("automatic full-screen opening is distinct from explicit answer", () => {
  assert.match(notificationService, /INCOMING_CALL_OPEN_ACTION/);
  assert.match(
    notificationService,
    /fullScreenAction:\s*\{[\s\S]*?id:\s*INCOMING_CALL_OPEN_ACTION/,
  );
  assert.match(
    notificationService,
    /pressAction:\s*\{\s*id:\s*INCOMING_CALL_OPEN_ACTION/,
  );
  assert.match(
    notifeeEvents,
    /actionId === INCOMING_CALL_ACCEPT_ACTION[\s\S]*navigateIncomingCallAnswerData\(data\)/,
  );
  assert.doesNotMatch(notifeeEvents, /CallAcceptedLocally/);
});

test("incoming call events deduplicate SignalR and FCM by callId", () => {
  assert.match(
    callEvents,
    /pendingIncomingCall\?\.callId === callId/,
  );
  assert.match(callEvents, /activeVoiceCall\?\.callId === callId/);
  assert.match(callEvents, /endedCallIds\.has\(callId\)/);
});
