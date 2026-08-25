import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./tab-bar-style.ts", import.meta.url), "utf8");

test("compact tab bar is flush with the viewport and lifts its content slightly", () => {
  assert.match(source, /TAB_BAR_BOTTOM\s*=\s*0/);
  assert.match(source, /TAB_BAR_HEIGHT\s*=\s*80/);
  assert.match(source, /left:\s*0/);
  assert.match(source, /paddingBottom:\s*12/);
  assert.match(source, /paddingTop:\s*4/);
  assert.match(source, /borderBottomLeftRadius:\s*0/);
  assert.match(source, /borderBottomRightRadius:\s*0/);
  assert.match(source, /right:\s*0/);
});
