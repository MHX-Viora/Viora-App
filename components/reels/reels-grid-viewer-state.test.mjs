import assert from "node:assert/strict";
import test from "node:test";

import { getReelViewerIndex } from "./reels-grid-viewer-state.ts";

test("profile reel viewer selects the next video while scrolling", () => {
  assert.equal(
    getReelViewerIndex({ itemCount: 3, itemHeight: 800, offset: 440 }),
    1,
  );
});

test("profile reel viewer keeps its index inside the available videos", () => {
  assert.equal(
    getReelViewerIndex({ itemCount: 2, itemHeight: 800, offset: 9_000 }),
    1,
  );
  assert.equal(
    getReelViewerIndex({ itemCount: 0, itemHeight: 800, offset: 0 }),
    null,
  );
});
