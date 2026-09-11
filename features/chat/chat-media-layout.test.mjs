import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getChatVideoSize } from "./chat-media-layout.ts";

const chatScreen = readFileSync(new URL("./chat-screen.tsx", import.meta.url), "utf8");
const chatMediaViewer = readFileSync(
  new URL("../../components/chat/chat-media-viewer.tsx", import.meta.url),
  "utf8",
);

test("chat video frames preserve portrait and landscape source ratios", () => {
  assert.deepEqual(
    getChatVideoSize({ height: 1920, width: 1080 }),
    { height: 320, width: 180 },
  );
  assert.deepEqual(
    getChatVideoSize({ height: 1080, width: 1920 }),
    { height: 135, width: 240 },
  );
  assert.deepEqual(
    getChatVideoSize({ height: 200, width: 120 }),
    { height: 200, width: 120 },
  );
});

test("chat video frame reads native and Web source dimensions", () => {
  assert.match(chatScreen, /useEvent\(player, "videoTrackChange"/);
  assert.match(chatScreen, /videoElement\.videoWidth/);
  assert.match(chatScreen, /"loadedmetadata"/);
  assert.match(chatScreen, /style=\{\[styles\.videoThumb, videoSize\]\}/);
});

test("chat videos stay paused in messages and play only in the detail viewer", () => {
  const videoAttachment = chatScreen.slice(
    chatScreen.indexOf("function VideoAttachment"),
    chatScreen.indexOf("function LocationCard"),
  );

  assert.doesNotMatch(videoAttachment, /nextPlayer\.play\(\)/);
  assert.doesNotMatch(videoAttachment, /nextPlayer\.loop\s*=\s*true/);
  assert.match(chatMediaViewer, /player\.play\(\)/);
});
