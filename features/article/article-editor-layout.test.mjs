import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editorSource = readFileSync(
  new URL("./article-editor-screen.tsx", import.meta.url),
  "utf8",
);

test("article create and edit share a flex-bounded vertically scrollable editor list", () => {
  assert.match(editorSource, /<DraggableFlatList[\s\S]*?style=\{styles\.editorList\}/);
  assert.match(editorSource, /containerStyle=\{styles\.editorList\}/);
  assert.match(editorSource, /keyboardDismissMode="on-drag"/);
  assert.match(editorSource, /nestedScrollEnabled/);
  assert.match(editorSource, /scrollEnabled/);
  assert.match(editorSource, /editorList:\s*\{\s*flex:\s*1,\s*minHeight:\s*0\s*\}/);
});

test("article create and edit use the same centered responsive desktop content width", () => {
  assert.match(editorSource, /getResponsiveContentLayout/);
  assert.match(editorSource, /layout\.articleMaxWidth/);
  assert.match(editorSource, /contentContainerStyle=\{\[styles\.content, editorContentLayout,/);
});

test("article editor reserves bottom space so the fixed toolbar does not cover content", () => {
  assert.match(editorSource, /paddingBottom:\s*90\s*\+\s*insets\.bottom\s*\+\s*keyboardSpacer/);
});
