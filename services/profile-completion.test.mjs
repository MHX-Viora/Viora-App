import assert from "node:assert/strict";
import test from "node:test";

import { completeExistingOrCreate } from "./profile-completion.ts";

test("updates an existing profile without creating another", async () => {
  const calls = [];
  const result = await completeExistingOrCreate(
    async () => { calls.push("PATCH"); return "updated"; },
    async () => { calls.push("POST"); return "created"; },
  );
  assert.equal(result, "updated");
  assert.deepEqual(calls, ["PATCH"]);
});

test("creates a profile only when PATCH says it is absent", async () => {
  const calls = [];
  const result = await completeExistingOrCreate(
    async () => { calls.push("PATCH"); throw Object.assign(new Error("missing"), { status: 404 }); },
    async () => { calls.push("POST"); return "created"; },
  );
  assert.equal(result, "created");
  assert.deepEqual(calls, ["PATCH", "POST"]);
});

test("does not create after a PATCH validation or server error", async () => {
  let creates = 0;
  await assert.rejects(
    completeExistingOrCreate(
      async () => { throw Object.assign(new Error("bad request"), { status: 400 }); },
      async () => { creates += 1; return "created"; },
    ),
    /bad request/,
  );
  assert.equal(creates, 0);
});
