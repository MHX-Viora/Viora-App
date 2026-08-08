import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./forward-message-screen.tsx", import.meta.url), "utf8");

test("forward message screen follows the selected theme background", () => {
  assert.match(source, /container:\s*\{\s*backgroundColor:\s*colors\.background,/);
  assert.doesNotMatch(source, /container:\s*\{\s*backgroundColor:\s*colors\.white,/);
  assert.match(source, /sendText:\s*\{\s*color:\s*colors\.primaryContrast,/);
  assert.doesNotMatch(source, /color=\{colors\.white\}/);
});
