import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getReelIndexFromOffset } from "./reel-pagination.ts";

const reelsScreenSource = readFileSync(
  new URL("./reels-screen.tsx", import.meta.url),
  "utf8",
);

test("scroll offsets activate every reel page and clamp to available items", () => {
  const input = { itemCount: 3, itemHeight: 800 };

  assert.equal(getReelIndexFromOffset({ ...input, offsetY: 0 }), 0);
  assert.equal(getReelIndexFromOffset({ ...input, offsetY: 800 }), 1);
  assert.equal(getReelIndexFromOffset({ ...input, offsetY: 1600 }), 2);
  assert.equal(getReelIndexFromOffset({ ...input, offsetY: 3200 }), 2);
});

test("crossing half a page activates the nearest reel during scrolling", () => {
  const input = { itemCount: 4, itemHeight: 800 };

  assert.equal(getReelIndexFromOffset({ ...input, offsetY: 399 }), 0);
  assert.equal(getReelIndexFromOffset({ ...input, offsetY: 400 }), 1);
  assert.equal(getReelIndexFromOffset({ ...input, offsetY: 1200 }), 2);
});

test("reels screen updates playback on scroll without rendering blank placeholders", () => {
  assert.match(reelsScreenSource, /onScroll=\{handleReelsScroll\}/);
  assert.doesNotMatch(reelsScreenSource, /Math\.abs\(index - activeIndex\) > 1/);
});

test("web reels keep page snapping through the supported paging prop", () => {
  assert.match(reelsScreenSource, /\n\s+pagingEnabled\r?\n/);
  assert.doesNotMatch(reelsScreenSource, /snapToInterval/);
});
