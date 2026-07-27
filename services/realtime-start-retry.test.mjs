import assert from "node:assert/strict";
import test from "node:test";

import { startWithRetry } from "./realtime-start-retry.ts";

test("retries an initial realtime connection failure until it succeeds", async () => {
  let attempts = 0;
  const delays = [];

  const connected = await startWithRetry({
    delaysMs: [0, 2000, 5000],
    isConnected: () => false,
    shouldContinue: () => true,
    sleep: async (delayMs) => {
      delays.push(delayMs);
    },
    start: async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("backend is waking up");
      }
    },
  });

  assert.equal(connected, true);
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [2000, 5000]);
});

test("stops retrying when realtime has been disabled", async () => {
  let attempts = 0;
  let shouldContinue = true;

  const connected = await startWithRetry({
    delaysMs: [0, 2000, 5000],
    isConnected: () => false,
    shouldContinue: () => shouldContinue,
    sleep: async () => {
      shouldContinue = false;
    },
    start: async () => {
      attempts += 1;
      throw new Error("offline");
    },
  });

  assert.equal(connected, false);
  assert.equal(attempts, 1);
});
