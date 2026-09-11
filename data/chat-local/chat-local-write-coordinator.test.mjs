import assert from "node:assert/strict";
import test from "node:test";

import {
  clearAfterLocalMutations,
  enqueueLocalMutation,
} from "./chat-local-write-coordinator.ts";

test("logout skips queued mutations from the previous cache generation", async () => {
  const events = [];
  const queued = enqueueLocalMutation(async () => { events.push("stale-write"); });
  await clearAfterLocalMutations(async () => { events.push("clear"); });
  await queued;
  assert.deepEqual(events, ["clear"]);
});

test("logout waits for an active mutation and clears after it", async () => {
  const events = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const active = enqueueLocalMutation(async () => {
    events.push("write-start");
    await gate;
    events.push("write-end");
  });
  await new Promise((resolve) => setImmediate(resolve));
  const clearing = clearAfterLocalMutations(async () => { events.push("clear"); });
  release();
  await Promise.all([active, clearing]);
  assert.deepEqual(events, ["write-start", "write-end", "clear"]);
});
