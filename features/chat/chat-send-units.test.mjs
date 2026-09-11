import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildChatSendUnits } from "./chat-send-units.ts";

const chatScreen = readFileSync(new URL("./chat-screen.tsx", import.meta.url), "utf8");

test("multiple attachments become ordered independent chat messages", () => {
  const attachments = [{ id: "image" }, { id: "video" }, { id: "document" }];

  assert.deepEqual(buildChatSendUnits("Chú thích", attachments), [
    { attachments: [], content: "Chú thích" },
    { attachments: [{ id: "image" }], content: "" },
    { attachments: [{ id: "video" }], content: "" },
    { attachments: [{ id: "document" }], content: "" },
  ]);
});

test("a text-only send remains one message", () => {
  assert.deepEqual(buildChatSendUnits("Xin chào", []), [
    { attachments: [], content: "Xin chào" },
  ]);
});

test("the chat screen settles each selected attachment message independently", () => {
  assert.match(chatScreen, /const sendUnits = buildChatSendUnits/);
  assert.match(
    chatScreen,
    /for \(const \{ optimisticId, unit, unitIndex \} of pendingMessages\)/,
  );
  assert.match(chatScreen, /attachments: unit\.attachments/);
  assert.match(
    chatScreen,
    /item\.id === optimisticId \? \{ \.\.\.item, sendStatus: "failed" \} : item/,
  );
});
