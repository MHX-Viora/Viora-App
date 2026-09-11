import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./profile-header.tsx", import.meta.url), "utf8");

test("web profile toolbar uses equal vertical spacing around its actions", () => {
  assert.match(source, /paddingBottom:\s*spacing\.sm/);
  assert.match(source, /paddingTop:\s*spacing\.sm/);
});

test("profile toolbar background reaches both phone edges and the viewport top", () => {
  const headerStyle = source.match(/header:\s*\{([\s\S]*?)\n  \},/)?.[1] ?? "";

  assert.doesNotMatch(headerStyle, /borderRadius/);
  assert.doesNotMatch(headerStyle, /marginHorizontal/);
  assert.doesNotMatch(headerStyle, /marginTop/);
});

test("native profile toolbar lowers only its content by ten pixels", () => {
  assert.match(source, /Platform\.OS\s*!==\s*"web"\s*&&\s*styles\.nativeHeader/);
  assert.match(source, /nativeHeader:\s*\{\s*paddingTop:\s*spacing\.sm\s*\+\s*10\s*\}/);
});
