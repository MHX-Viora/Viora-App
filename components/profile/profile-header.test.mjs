import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./profile-header.tsx", import.meta.url), "utf8");

test("profile toolbar uses equal vertical spacing around its actions", () => {
  assert.match(source, /paddingBottom:\s*spacing\.sm/);
  assert.match(source, /paddingTop:\s*spacing\.sm/);
});
