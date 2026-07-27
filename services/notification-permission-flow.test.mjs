import assert from "node:assert/strict";
import test from "node:test";

import { requestNotificationPermission } from "./notification-permission-flow.ts";

test("optional channel failure does not prevent the permission prompt", async () => {
  const events = [];

  const permission = await requestNotificationPermission({
    ensureRequiredChannel: async () => {
      events.push("required-channel");
    },
    getPermissions: async () => ({
      status: "undetermined",
    }),
    onOptionalSetupError: () => {
      events.push("optional-error");
    },
    requestPermissions: async () => {
      events.push("permission-prompt");
      return { status: "granted" };
    },
    setupOptionalChannels: async () => {
      events.push("optional-channel");
      throw new Error("Notifee channel failed");
    },
  });

  assert.equal(permission.status, "granted");
  assert.deepEqual(events, [
    "required-channel",
    "permission-prompt",
    "optional-channel",
    "optional-error",
  ]);
});
