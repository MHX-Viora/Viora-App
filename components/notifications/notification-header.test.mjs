import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./notification-header.tsx", import.meta.url), "utf8");

test("compact web notification header keeps the title close to the top", () => {
  assert.match(source, /useResponsive/);
  assert.match(
    source,
    /paddingTop:\s*isCompactWeb\s*\?\s*16\s*:\s*isWeb\s*\?\s*28\s*:\s*54/,
  );
  assert.match(source, /paddingBottom:\s*isWeb\s*\?\s*spacing\.sm\s*:\s*spacing\.md/);
});
