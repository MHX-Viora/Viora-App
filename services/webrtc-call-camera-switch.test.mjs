import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serviceSource = readFileSync(
  new URL("./webrtc-call.service.ts", import.meta.url),
  "utf8",
);
const screenSource = readFileSync(
  new URL("../features/calls/voice-call-screen.native.tsx", import.meta.url),
  "utf8",
);

test("native camera switching replaces the active video track", () => {
  assert.match(serviceSource, /switchCamera: async \(\) =>/);
  assert.match(serviceSource, /mediaDevices\.getUserMedia\(\{[\s\S]{0,180}video: \{ facingMode \}/);
  assert.match(serviceSource, /acquireCameraTrack\(nextFacingMode\)/);
  assert.match(serviceSource, /previousTrack\.release\?\.\(\)/);
  assert.match(serviceSource, /videoSender\.replaceTrack\(replacementTrack\)/);
  assert.doesNotMatch(serviceSource, /track\._switchCamera/);
});

test("camera switching failures are surfaced to the caller", () => {
  assert.match(screenSource, /await peerRef\.current\.switchCamera\(\)/);
  assert.match(screenSource, /Không thể đổi camera/);
});
