import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./tab-bar-style.ts", import.meta.url), "utf8");

test("tab bar background reaches the bottom without moving its content", () => {
  assert.match(source, /TAB_BAR_BOTTOM\s*=\s*0/);
  assert.match(source, /TAB_BAR_HEIGHT\s*=\s*96/);
  assert.match(source, /paddingBottom:\s*26/);
  assert.match(source, /borderBottomLeftRadius:\s*0/);
  assert.match(source, /borderBottomRightRadius:\s*0/);
});
