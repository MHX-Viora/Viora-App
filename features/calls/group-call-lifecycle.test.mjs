import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { shouldEndGroupCallOnLocalExit } from "./group-call-lifecycle.ts";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("the group call ends when the last local participant exits", () => {
  assert.equal(shouldEndGroupCallOnLocalExit(0), true);
  assert.equal(shouldEndGroupCallOnLocalExit(1), false);
});

test("native and web cleanup end an empty group call before disconnecting", () => {
  for (const screen of [
    read("./group-call-screen.tsx"),
    read("./group-call-screen.web.tsx"),
  ]) {
    assert.match(
      screen,
      /return \(\) => \{[\s\S]*shouldEndGroupCallOnLocalExit\([\s\S]*remoteParticipants\.size[\s\S]*endGroupCall\(callId\)/,
    );
  }
});
