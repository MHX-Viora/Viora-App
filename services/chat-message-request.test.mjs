import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createSingleFlight } from "./single-flight.ts";

const chatService = readFileSync(new URL("./chat.service.ts", import.meta.url), "utf8");

test("single-flight shares one request for an identical resource key", async () => {
  const singleFlight = createSingleFlight();
  let calls = 0;
  let resolveRequest;
  const request = () => {
    calls += 1;
    return new Promise((resolve) => { resolveRequest = resolve; });
  };

  const first = singleFlight.run("room-a:1:30", request);
  const second = singleFlight.run("room-a:1:30", request);

  assert.equal(first, second);
  assert.equal(calls, 1);
  resolveRequest({ page: 1 });
  assert.deepEqual(await first, { page: 1 });
});

test("single-flight isolates keys and clears completed requests", async () => {
  const singleFlight = createSingleFlight();
  let calls = 0;
  const request = async () => ++calls;

  assert.equal(await singleFlight.run("room-a:1:30", request), 1);
  assert.equal(await singleFlight.run("room-b:1:30", request), 2);
  assert.equal(await singleFlight.run("room-a:1:30", request), 3);
});

test("message API uses conversation, page, and page size as its request key", () => {
  assert.match(chatService, /messageRequests\.run\(\s*`\$\{conversationId\}:\$\{query\.page\}:\$\{query\.pageSize\}`/);
});

test("conversation list requests deduplicate identical query pages", () => {
  assert.match(chatService, /const keyword = query\.keyword\?\.trim\(\) \?\? ""/);
  assert.match(chatService, /conversationRequests\.run\(\s*`\$\{keyword\}:\$\{query\.page\}:\$\{query\.pageSize\}`/);
});
