import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const voiceCallScreen = read("./voice-call-screen.native.tsx");
const groupCallScreen = read("./group-call-screen.tsx");
const webrtcService = read("../../services/webrtc-call.service.ts");

test("receiver gets media permission before accepting the call", () => {
  assert.match(
    voiceCallScreen,
    /if \(mode === "receiver"\) \{[\s\S]*await requestCallMediaPermissions\(isVideoCall\);[\s\S]*const callConnection = await startCallRealtime\(\);[\s\S]*if \(!callConnection\)[\s\S]*await acceptVoiceCall\(callId\);[\s\S]*const peer = await createPeer\(\);/,
  );
  assert.match(
    webrtcService,
    /export const requestCallMediaPermissions[\s\S]*requestRecordingPermissionsAsync[\s\S]*requestCameraPermissionsAsync/,
  );
});

test("native group call requests media permission before joining", () => {
  assert.match(
    groupCallScreen,
    /requestCallMediaPermissions\(false\)[\s\S]*joinGroupCall\(callId\)[\s\S]*requestCallMediaPermissions\(value\.call\.callType === CallType\.Video\)/,
  );
});

test("native media setup failures close the call for both participants", () => {
  assert.match(
    voiceCallScreen,
    /const failCall = useCallback\([\s\S]*await endVoiceCall\(callId\)[\s\S]*leaveCall\(\)/,
  );
  assert.match(
    voiceCallScreen,
    /if \(mode === "receiver"\)[\s\S]*catch \(error\) \{[\s\S]*await failCall\(/,
  );
});

test("native calls stop when WebRTC stays connecting past the deadline", () => {
  assert.match(voiceCallScreen, /CALL_CONNECT_TIMEOUT_MS/);
  assert.match(
    voiceCallScreen,
    /if \(!callId \|\| status !== "connecting"\) return;[\s\S]*setTimeout\([\s\S]*failCall\([\s\S]*CALL_CONNECT_TIMEOUT_MS/,
  );
});

test("native call audio controls use the same speaker icons as Web", () => {
  assert.match(
    voiceCallScreen,
    /name=\{isSpeakerEnabled \? "volume-high" : "volume-mute"\}/,
  );
  assert.match(
    groupCallScreen,
    /icon=\{isSpeaker \? "volume-high" : "volume-mute"\}/,
  );
  assert.doesNotMatch(voiceCallScreen, /ear-outline/);
  assert.doesNotMatch(groupCallScreen, /icon=\{isSpeaker \? "volume-high" : "ear"\}/);
});
