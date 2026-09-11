import assert from "node:assert/strict";
import test from "node:test";

import { toggleChatAudioPlayback } from "./chat-audio-playback.ts";

test("playing audio pauses without resetting the player", async () => {
  const calls = [];
  await toggleChatAudioPlayback({
    player: {
      pause: () => calls.push("pause"),
      play: () => calls.push("play"),
      seekTo: async () => calls.push("seek"),
    },
    preparePlayback: async () => calls.push("prepare"),
    status: { currentTime: 1, didJustFinish: false, duration: 3, playing: true },
  });
  assert.deepEqual(calls, ["pause"]);
});

test("finished audio resets to the beginning before replaying", async () => {
  const calls = [];
  await toggleChatAudioPlayback({
    player: {
      pause: () => calls.push("pause"),
      play: () => calls.push("play"),
      seekTo: async (seconds) => calls.push(`seek:${seconds}`),
    },
    preparePlayback: async () => calls.push("prepare"),
    status: { currentTime: 3, didJustFinish: true, duration: 3, playing: false },
  });
  assert.deepEqual(calls, ["prepare", "seek:0", "play"]);
});
