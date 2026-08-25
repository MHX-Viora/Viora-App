import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readService = (name) =>
  readFileSync(new URL(`./${name}.web.ts`, import.meta.url), "utf8");
const readCallScreen = (name) =>
  readFileSync(
    new URL(`../features/calls/${name}.web.tsx`, import.meta.url),
    "utf8",
  );

const forbiddenNativeImports =
  /@notifee\/react-native|@react-native-firebase|@react-native-google-signin|@livekit\/react-native|@livekit\/react-native-webrtc|expo-secure-store/;

test("web notification and call adapters do not import native SDKs", () => {
  const adapters = [
    "push-notification.service",
    "incoming-call-notifee-events",
    "incoming-call-notification.service",
    "chat-push-notification.service",
    "foreground-notification.service",
  ];

  for (const adapter of adapters) {
    assert.doesNotMatch(readService(adapter), forbiddenNativeImports, adapter);
  }
});

test("web push adapter preserves the root-layout contract", () => {
  const source = readService("push-notification.service");

  for (const exportName of [
    "registerPushNotifications",
    "setupNotificationHandling",
    "setupNotificationResponseHandling",
    "setupPushTokenRefreshHandling",
    "unregisterCurrentDevicePushToken",
  ]) {
    assert.match(source, new RegExp(`export const ${exportName}\\b`));
  }
});

test("web call routes do not import React Native WebRTC or LiveKit Native", () => {
  for (const screen of ["voice-call-screen", "group-call-screen"]) {
    assert.doesNotMatch(readCallScreen(screen), forbiddenNativeImports, screen);
  }
});

test("web call routes use browser WebRTC and the existing LiveKit web client", () => {
  const voice = readCallScreen("voice-call-screen");
  const group = readCallScreen("group-call-screen");

  assert.match(voice, /webrtc-call\.service\.web/);
  assert.match(voice, /sendCallOffer/);
  assert.match(voice, /ReceiveIceCandidate/);
  assert.doesNotMatch(voice, /WebCallUnavailable/);
  assert.match(group, /from "livekit-client"/);
  assert.match(group, /joinGroupCall/);
  assert.doesNotMatch(group, /WebCallUnavailable/);
});

test("application entry delegates native initialization to a platform bootstrap", () => {
  const entry = readFileSync(new URL("../index.js", import.meta.url), "utf8");
  const webBootstrap = readFileSync(
    new URL("../platform-bootstrap.web.ts", import.meta.url),
    "utf8",
  );

  assert.match(entry, /platform-bootstrap/);
  assert.doesNotMatch(entry, forbiddenNativeImports);
  assert.doesNotMatch(webBootstrap, forbiddenNativeImports);
});

test("voice-call fallback dispatches by platform without eagerly importing native WebRTC", () => {
  const fallback = readFileSync(
    new URL("../features/calls/voice-call-screen.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(fallback, forbiddenNativeImports);
  assert.match(fallback, /Platform\.OS === "web"/);
  assert.match(fallback, /voice-call-screen\.web/);
  assert.match(fallback, /voice-call-screen\.native/);
});
