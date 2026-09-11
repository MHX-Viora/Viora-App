import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isMessageFromCurrentUser } from "./chat-realtime-policy.ts";

const chatEvents = readFileSync(new URL("./chat-events.ts", import.meta.url), "utf8");
const realtimeService = readFileSync(
  new URL("../../services/realtime.service.ts", import.meta.url),
  "utf8",
);

test("new-message event from the current user is ignored", () => {
  assert.equal(isMessageFromCurrentUser("user-1", "user-1"), true);
  assert.equal(isMessageFromCurrentUser("ABC-123", "abc-123"), true);
});

test("new-message event from another user is emitted", () => {
  assert.equal(isMessageFromCurrentUser("user-1", "user-2"), false);
  assert.equal(isMessageFromCurrentUser("user-1", null), false);
});

test("SignalR filters current-user notifications before publishing them", () => {
  assert.match(realtimeService, /getUser\(\)\.catch\(\(\) => null\)/);
  assert.match(
    realtimeService,
    /emitRealtimeNewMessageNotification\(payload, currentUser\?\.id\)/,
  );
  assert.match(chatEvents, /isMessageFromCurrentUser\(event\.sender\?\.id, currentUserId\)/);
});
