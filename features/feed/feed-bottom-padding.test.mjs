import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./feed-screen.tsx", import.meta.url), "utf8");

test("home feed clears the floating tab bar and safe area", () => {
  assert.match(source, /useSafeAreaInsets\(\)/);
  assert.match(
    source,
    /TAB_BAR_BOTTOM\s*\+\s*TAB_BAR_HEIGHT\s*\+\s*insets\.bottom\s*\+\s*spacing\.lg/,
  );
  assert.match(source, /contentContainerStyle=\{\[\s*styles\.content,\s*\{ paddingBottom: feedBottomPadding \}/);
});
