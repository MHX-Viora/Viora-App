import assert from "node:assert/strict";
import test from "node:test";
import { parseRecentStickers, promoteRecentSticker } from "./recent-stickers.ts";

const sticker = (id) => ({ id, stickerPackId: "pack", name: id, imageUrl: `https://cdn/${id}.webp`, thumbnailUrl: null, format: 1, sortOrder: 0 });

test("recent stickers are unique and move reused items to the front", () => {
  assert.deepEqual(promoteRecentSticker([sticker("a"), sticker("b")], sticker("b")).map((item) => item.id), ["b", "a"]);
});

test("recent stickers stay bounded and malformed storage is ignored", () => {
  const current = Array.from({ length: 24 }, (_, index) => sticker(String(index)));
  assert.equal(promoteRecentSticker(current, sticker("new")).length, 24);
  assert.deepEqual(parseRecentStickers("not-json"), []);
});
