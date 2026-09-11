import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("backgrounding a Web tab keeps the global realtime connection alive", () => {
  const layout = read("../../app/_layout.tsx");
  assert.match(layout, /Platform\.OS === "web"/);
  assert.match(layout, /state !== "active"[\s\S]*Platform\.OS === "web"[\s\S]*return/);
});

test("incoming call delivery persists the call and handles answered elsewhere", () => {
  const realtime = read("../../services/realtime.service.ts");
  assert.match(realtime, /connection\.on\("IncomingCall"[\s\S]*savePendingIncomingCall/);
  assert.match(realtime, /connection\.on\("CallAnsweredElsewhere"/);
  assert.match(realtime, /acceptedConnectionId[\s\S]*connection\?\.connectionId/);
});

test("Web pending calls survive refresh in session storage", () => {
  const pending = read("../../services/pending-incoming-call.service.ts");
  assert.match(pending, /window\.sessionStorage/);
  assert.doesNotMatch(pending, /let webPendingIncomingCall/);
});

test("the accept request identifies the winning realtime connection", () => {
  const callService = read("../../services/call.service.ts");
  assert.match(callService, /X-ANKT-Realtime-Connection-Id/);
  assert.match(callService, /getRealtimeConnectionId/);
});
