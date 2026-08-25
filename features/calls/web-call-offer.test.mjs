import assert from "node:assert/strict";
import test from "node:test";

import {
  createWebCallOfferState,
  sendWebCallOfferOnce,
} from "./web-call-offer.ts";

test("a failed Web offer stays available for retry instead of ending the call", async () => {
  const state = createWebCallOfferState();
  const offer = { sdp: "video-offer", type: "offer" };

  const result = await sendWebCallOfferOnce(
    state,
    async () => offer,
    async () => { throw new Error("signal interrupted"); },
  );

  assert.equal(result.status, "failed");
  assert.equal(state.offer, offer);
  assert.equal(state.sent, false);
  assert.equal(state.sending, false);
});

test("retry sends the same Web offer and marks it delivered", async () => {
  const state = createWebCallOfferState();
  const offer = { sdp: "video-offer", type: "offer" };
  let createCount = 0;
  const delivered = [];

  await sendWebCallOfferOnce(
    state,
    async () => { createCount += 1; return offer; },
    async () => { throw new Error("first attempt failed"); },
  );
  const result = await sendWebCallOfferOnce(
    state,
    async () => { createCount += 1; return offer; },
    async (value) => { delivered.push(value); },
  );

  assert.equal(result.status, "sent");
  assert.equal(createCount, 1);
  assert.deepEqual(delivered, [offer]);
  assert.equal(state.sent, true);
  assert.equal(state.offer, null);
});

test("duplicate accepted events cannot send concurrent offers", async () => {
  const state = createWebCallOfferState();
  let releaseSend;
  const waitingSend = new Promise((resolve) => { releaseSend = resolve; });
  const first = sendWebCallOfferOnce(
    state,
    async () => ({ sdp: "offer", type: "offer" }),
    async () => waitingSend,
  );

  const duplicate = await sendWebCallOfferOnce(
    state,
    async () => ({ sdp: "duplicate", type: "offer" }),
    async () => undefined,
  );
  releaseSend();
  await first;

  assert.equal(duplicate.status, "in-flight");
});

