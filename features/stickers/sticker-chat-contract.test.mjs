import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chat = readFileSync(new URL("../chat/chat-screen.tsx", import.meta.url), "utf8");
const service = readFileSync(new URL("../../services/chat.service.ts", import.meta.url), "utf8");

test("chat sends database sticker ids immediately and renders dedicated sticker messages", () => {
  assert.match(service, /stickerId: input\.stickerId/);
  assert.match(service, /input\.stickerId \? 5/);
  assert.match(chat, /function StickerMessage/);
  assert.match(chat, /onSelect=\{\(sticker\) => void sendSticker\(sticker\)\}/);
});

test("chat sticker panel no longer reads the legacy hard-coded list", () => {
  assert.doesNotMatch(chat, /CHAT_STICKERS/);
});
