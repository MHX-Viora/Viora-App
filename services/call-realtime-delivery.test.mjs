import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./call-realtime.service.ts", import.meta.url),
  "utf8",
);

test("call signaling reports a disconnected hub instead of silently dropping offers", () => {
  assert.doesNotMatch(source, /next\?\.invoke/);
  assert.match(source, /if \(!next\)[\s\S]*throw new Error/);
  assert.match(source, /invokeCallHub\("Offer", callId, offer\)/);
});

