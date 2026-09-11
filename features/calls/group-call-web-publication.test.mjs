import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const groupCallWeb = readFileSync(
  new URL("./group-call-screen.web.tsx", import.meta.url),
  "utf8",
);

test("web group calls do not mutate LiveKit track publications", () => {
  assert.doesNotMatch(groupCallWeb, /Object\.assign\(publication/);
  assert.match(
    groupCallWeb,
    /entries\.push\(\{[\s\S]*isLocal,[\s\S]*participantName,[\s\S]*publication,[\s\S]*\}\)/,
  );
});

test("web video tiles read the wrapped LiveKit publication", () => {
  assert.match(groupCallWeb, /item\.publication\.track/);
  assert.match(groupCallWeb, /item\.publication\.trackSid/);
});
