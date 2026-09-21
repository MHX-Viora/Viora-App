import assert from "node:assert/strict";
import test from "node:test";

import { completeExistingOrCreate } from "./profile-completion.ts";

test("completion updates an existing Google profile without creating another", async () => {
  const calls = [];
  const user = { displayName: "KaKa" };
  const result = await completeExistingOrCreate(
    async () => { calls.push("PATCH"); return user; },
    async () => { calls.push("POST"); return user; },
  );
  assert.equal(result, user);
  assert.deepEqual(calls, ["PATCH"]);
});

test("completion creates a profile only after the backend confirms it is absent", async () => {
  const calls = [];
  const result = await completeExistingOrCreate(
    async () => { calls.push("PATCH"); throw { status: 404 }; },
    async () => { calls.push("POST"); return { id: "new" }; },
  );
  assert.equal(result.id, "new");
  assert.deepEqual(calls, ["PATCH", "POST"]);
});

test("completion preserves real errors instead of converting conflicts into success", async () => {
  let createCalls = 0;
  const error = { status: 409 };
  await assert.rejects(
    completeExistingOrCreate(
      async () => { throw error; },
      async () => { createCalls += 1; },
    ),
    (received) => received === error,
  );
  assert.equal(createCalls, 0);
});
