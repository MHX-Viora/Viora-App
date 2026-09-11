import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getNextReadMilestone,
  getReadPercentage,
} from "./article-reading-progress.ts";

const readerSource = readFileSync(
  new URL("./article-reader-screen.tsx", import.meta.url),
  "utf8",
);

test("read percentage includes the visible viewport and is bounded", () => {
  assert.equal(getReadPercentage({ contentHeight: 1000, offsetY: 0, viewportHeight: 200 }), 20);
  assert.equal(getReadPercentage({ contentHeight: 1000, offsetY: 850, viewportHeight: 200 }), 100);
  assert.equal(getReadPercentage({ contentHeight: 200, offsetY: 0, viewportHeight: 400 }), 100);
});

test("reading milestones only advance at thirty, seventy, and ninety percent", () => {
  assert.equal(getNextReadMilestone(29, 0), null);
  assert.equal(getNextReadMilestone(30, 0), 30);
  assert.equal(getNextReadMilestone(75, 30), 70);
  assert.equal(getNextReadMilestone(100, 90), null);
});

test("article reader records one open and throttled milestone views", () => {
  assert.match(readerSource, /trackArticleInteraction\(article\.id, "open"\)/);
  assert.match(readerSource, /getNextReadMilestone/);
  assert.match(readerSource, /scrollEventThrottle=\{250\}/);
});
