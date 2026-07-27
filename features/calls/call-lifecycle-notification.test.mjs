import assert from "node:assert/strict";
import test from "node:test";

import { isCallLifecycleNotificationType } from "./call-waiting.ts";

test("call lifecycle notifications close the active incoming call alert", () => {
  for (const type of [
    "CallRejected",
    "CallCancelled",
    "CallEnded",
    "CallMissed",
    "CallTimeout",
  ]) {
    assert.equal(isCallLifecycleNotificationType(type), true);
  }
  assert.equal(isCallLifecycleNotificationType("IncomingCall"), false);
});
