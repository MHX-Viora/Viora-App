import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./voice-call-screen.web.tsx", import.meta.url),
  "utf8",
);

test("web voice calls reuse the app call visuals and responsive phone surface", () => {
  assert.match(source, /CallBackdrop/);
  assert.match(source, /CallAvatarHalo/);
  assert.match(source, /UserAvatar/);
  assert.match(source, /getCallSurfaceLayout/);
  assert.match(source, /useTheme/);
});

test("web voice calls show active duration and app-equivalent media controls", () => {
  assert.match(source, /elapsedSeconds/);
  assert.match(source, /setInterval\(update, 1000\)/);
  assert.match(source, /accessibilityLabel=\{micOn/);
  assert.match(source, /accessibilityLabel=\{speakerOn/);
  assert.match(source, /accessibilityLabel=\{cameraOn/);
  assert.match(source, /accessibilityLabel="Kết thúc cuộc gọi"/);
});

test("an outgoing Web offer failure stays on the call screen and can retry", () => {
  assert.match(source, /sendWebCallOfferOnce/);
  assert.match(source, /subscribeCallAccepted/);
  assert.match(source, /record\.callId[\s\S]*record\.id/);
  assert.match(source, /retryOffer/);
  assert.match(source, /accessibilityLabel="Thử kết nối lại"/);
  assert.doesNotMatch(source, /sendOffer\(\)\.catch\(\(\) => void leave\(\)\)/);
});

test("temporary ICE delivery failures do not become unhandled Web rejections", () => {
  assert.match(source, /sendCallIceCandidate\(callId, candidate\)\.catch/);
});
