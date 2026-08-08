import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./post-card.tsx", import.meta.url),
  "utf8",
);

test("post visibility is rendered below the author name row", () => {
  assert.match(
    source,
    /<View style=\{styles\.authorRow\}>[\s\S]*?<\/View>\s*<View style=\{styles\.postMetadata\}>[\s\S]*?visibility\.label/,
  );
});
