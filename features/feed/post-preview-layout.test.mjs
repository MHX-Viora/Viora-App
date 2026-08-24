import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { layout } from "../../theme/layout.ts";

const postPreviewSource = readFileSync(
  new URL("./post-preview-screen.tsx", import.meta.url),
  "utf8",
);

test("post detail is centered in a readable desktop column", () => {
  assert.equal(layout.postDetailMaxWidth, 760);
  assert.match(postPreviewSource, /ResponsiveContent/);
  assert.match(postPreviewSource, /layout\.postDetailMaxWidth/);
});
