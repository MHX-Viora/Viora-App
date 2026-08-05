import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./edit-profile-screen.tsx", import.meta.url),
  "utf8",
);

test("cover image button keeps readable content on its dark overlay", () => {
  assert.match(
    source,
    /<Ionicons color=\{colors\.white\} name="camera" size=\{15\} \/>/,
  );
  assert.match(
    source,
    /imageButtonText:\s*\{\s*color: colors\.white,/,
  );
});
