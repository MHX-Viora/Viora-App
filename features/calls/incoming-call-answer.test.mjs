import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const voiceCallScreen = read("./voice-call-screen.native.tsx");

test("receiver connects the call hub before accepting the call", () => {
  assert.match(
    voiceCallScreen,
    /if \(mode === "receiver"\)[\s\S]*const callConnection = await startCallRealtime\(\);[\s\S]*if \(!callConnection\)[\s\S]*await acceptVoiceCall\(callId\);/,
  );
});
