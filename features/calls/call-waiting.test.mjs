import assert from "node:assert/strict";
import test from "node:test";

import {
  CALL_CONNECT_TIMEOUT_MS,
  shouldShowIncomingCallNotification,
} from "./call-waiting.ts";

test("foreground call invite is owned by the incoming-call host", () => {
  assert.equal(shouldShowIncomingCallNotification("active"), false);
});

test("background and inactive call invites use a notification", () => {
  assert.equal(shouldShowIncomingCallNotification("background"), true);
  assert.equal(shouldShowIncomingCallNotification("inactive"), true);
});

test("an accepted call cannot stay connecting forever", () => {
  assert.equal(CALL_CONNECT_TIMEOUT_MS, 30_000);
});
