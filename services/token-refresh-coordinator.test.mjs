import assert from "node:assert/strict";
import test from "node:test";

import { createTokenRefreshCoordinator } from "./token-refresh-coordinator.ts";

test("concurrent unauthorized requests share one token refresh", async () => {
  let refreshCalls = 0;
  let resolveRefresh;
  const refresh = () => {
    refreshCalls += 1;
    return new Promise((resolve) => {
      resolveRefresh = resolve;
    });
  };
  const coordinateRefresh = createTokenRefreshCoordinator(
    async () => (await refresh()).accessToken,
    async () => "expired-token",
  );

  const requests = Array.from({ length: 5 }, () =>
    coordinateRefresh("expired-token"),
  );

  await Promise.resolve();
  assert.equal(refreshCalls, 1);
  resolveRefresh({ accessToken: "fresh-token" });
  assert.deepEqual(await Promise.all(requests), Array(5).fill("fresh-token"));
});

test("a late 401 reuses the token refreshed by an earlier request", async () => {
  let refreshCalls = 0;
  const coordinateRefresh = createTokenRefreshCoordinator(
    async () => {
      refreshCalls += 1;
      return "unexpected-token";
    },
    async () => "already-refreshed-token",
  );

  assert.equal(
    await coordinateRefresh("expired-token"),
    "already-refreshed-token",
  );
  assert.equal(refreshCalls, 0);
});

test("a failed refresh does not block a later refresh attempt", async () => {
  let refreshCalls = 0;
  const coordinateRefresh = createTokenRefreshCoordinator(
    async () => {
      refreshCalls += 1;
      if (refreshCalls === 1) throw new Error("refresh failed");
      return "recovered-token";
    },
    async () => "expired-token",
  );

  await assert.rejects(coordinateRefresh("expired-token"), /refresh failed/);
  await assert.doesNotReject(coordinateRefresh("expired-token"));
  assert.equal(refreshCalls, 2);
});
