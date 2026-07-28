import assert from "node:assert/strict";
import test from "node:test";

import {
  CALL_ANSWER_TIMEOUT_MS,
  INCOMING_CALL_CHANNEL_ID,
  getIncomingCallNotificationId,
  INCOMING_CALL_RINGTONE_ANDROID,
  INCOMING_CALL_RINGTONE_FILE,
  INCOMING_CALL_VIBRATION_PATTERN,
  isCallLifecycleNotificationType,
  isIncomingCallNotificationType,
  OUTGOING_RINGBACK_FILE,
  OUTGOING_RINGBACK_VOLUME,
  shouldNavigateAwayFromCall,
  shouldUseFullScreenCallAction,
  isWaitingForAnswer,
} from "./call-waiting.ts";

test("unanswered outgoing calls time out after exactly 30 seconds", () => {
  assert.equal(CALL_ANSWER_TIMEOUT_MS, 30_000);
});

test("outgoing wait policy is used only for the caller timeout", () => {
  assert.equal(isWaitingForAnswer("caller", "calling"), true);
  assert.equal(isWaitingForAnswer("caller", "connecting"), false);
  assert.equal(isWaitingForAnswer("receiver", "connecting"), false);
});

test("incoming notifications use the bundled receiver ringtone", () => {
  assert.equal(INCOMING_CALL_CHANNEL_ID, "incoming-calls-v4");
  assert.equal(INCOMING_CALL_RINGTONE_ANDROID, "nhac_chuong");
  assert.equal(INCOMING_CALL_RINGTONE_FILE, "nhac_chuong.mp3");
});

test("outgoing calls use a separate caller ringback track", () => {
  assert.equal(OUTGOING_RINGBACK_FILE, "nhac_cho.mp3");
  assert.notEqual(OUTGOING_RINGBACK_FILE, INCOMING_CALL_RINGTONE_FILE);
});

test("Notifee vibration pattern contains only positive durations", () => {
  assert.ok(INCOMING_CALL_VIBRATION_PATTERN.length > 0);
  assert.equal(
    INCOMING_CALL_VIBRATION_PATTERN.every(
      (duration) => Number.isInteger(duration) && duration > 0,
    ),
    true,
  );
});

test("outgoing ringback plays at full player volume", () => {
  assert.equal(OUTGOING_RINGBACK_VOLUME, 1);
});

test("incoming calls have a stable notification id", () => {
  assert.equal(getIncomingCallNotificationId("call-123"), "incoming-call-call-123");
  assert.equal(getIncomingCallNotificationId(""), "");
});

test("group calls use the incoming call notification experience", () => {
  assert.equal(isIncomingCallNotificationType("IncomingCall"), true);
  assert.equal(isIncomingCallNotificationType("GroupCall"), true);
  assert.equal(isIncomingCallNotificationType("GroupCallEnded"), false);
  assert.equal(isCallLifecycleNotificationType("GroupCallEnded"), true);
});

test("stale call timers cannot navigate after the screen unmounts", () => {
  assert.equal(shouldNavigateAwayFromCall(true, false), true);
  assert.equal(shouldNavigateAwayFromCall(false, false), false);
  assert.equal(shouldNavigateAwayFromCall(true, true), false);
});

test("full-screen call action is reserved for background delivery", () => {
  assert.equal(shouldUseFullScreenCallAction("active"), false);
  assert.equal(shouldUseFullScreenCallAction("background"), true);
  assert.equal(shouldUseFullScreenCallAction("unknown"), true);
});
