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
  assert.match(source, /addIceCandidate\(event\.signal\)\.catch/);
});

test("web calls close from global terminal lifecycle events", () => {
  assert.match(source, /subscribeCallLifecycle/);
  assert.match(source, /event\.callId === callId[\s\S]*closePeer\(\)[\s\S]*backToChat\(\)/);
});

test("web calls renegotiate through the existing call reconnect contract", () => {
  assert.match(source, /onCallRealtime\("ReconnectCall"/);
  assert.match(source, /onCallRealtimeReconnected/);
  assert.match(source, /sendReconnectCall\(callId\)/);
});

test("late WebRTC creation closes media after the call screen is disposed", () => {
  assert.match(source, /disposedRef\.current \|\| endingRef\.current[\s\S]*peer\.close\(\)/);
});

test("a receiver ends an accepted call when browser media setup fails", () => {
  assert.match(source, /await acceptVoiceCall\(callId\);\s*acceptedRef\.current = true/);
  assert.match(source, /acceptedRef\.current[\s\S]*await endVoiceCall\(callId\)/);
  assert.match(source, /Không thể bắt đầu cuộc gọi[\s\S]*await leave\(\)/);
});
