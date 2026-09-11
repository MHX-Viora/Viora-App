import assert from "node:assert/strict";
import test from "node:test";

import { canMarkConversationRead } from "./chat-read-visibility.ts";

test("marks messages read only while the conversation is focused and visible", () => {
  assert.equal(
    canMarkConversationRead({ appState: "active", documentVisibility: "visible", isFocused: true }),
    true,
  );
  assert.equal(
    canMarkConversationRead({ appState: "active", documentVisibility: "visible", isFocused: false }),
    false,
  );
  assert.equal(
    canMarkConversationRead({ appState: "background", documentVisibility: "visible", isFocused: true }),
    false,
  );
  assert.equal(
    canMarkConversationRead({ appState: "active", documentVisibility: "hidden", isFocused: true }),
    false,
  );
});
