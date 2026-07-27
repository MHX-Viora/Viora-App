import assert from "node:assert/strict";
import test from "node:test";

import { getCurrentNotificationData } from "./push-notification-time.ts";

test("local notification data excludes timestamp fields reserved by notification SDKs", () => {
  const result = getCurrentNotificationData({
    conversationId: "conversation-1",
    sentTime: 1_783_000_000_000,
    timestamp: 1_783_000_000_000,
  });

  assert.equal(result.conversationId, "conversation-1");
  assert.equal(typeof result.createdAt, "string");
  assert.equal("sentTime" in result, false);
  assert.equal("timestamp" in result, false);
});
