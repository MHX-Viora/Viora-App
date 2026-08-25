import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getContainedVideoSize,
  getReelDesktopCopyWidth,
  getReelVideoContentWidth,
  getReelVideoVerticalShift,
  WEB_REEL_VIDEO_STYLE,
} from "../../components/reels/reel-layout.ts";
import { getReelContentWidth } from "../../components/layout/responsive-layout.ts";

const reelCardSource = readFileSync(
  new URL("../../components/reels/reel-card.tsx", import.meta.url),
  "utf8",
);
const reelPreviewSource = readFileSync(
  new URL("./reel-preview-screen.tsx", import.meta.url),
  "utf8",
);

test("reel foreground video preserves its source aspect ratio", () => {
  assert.match(reelCardSource, /<VideoView[\s\S]{0,160}contentFit="contain"/);
});

test("landscape video fits completely inside the portrait reel viewport", () => {
  assert.deepEqual(
    getContainedVideoSize({
      containerHeight: 768,
      containerWidth: 444,
      videoHeight: 1080,
      videoWidth: 1920,
    }),
    { height: 250, width: 444 },
  );
});

test("portrait video fits by height without stretching or cropping", () => {
  assert.deepEqual(
    getContainedVideoSize({
      containerHeight: 768,
      containerWidth: 444,
      videoHeight: 1920,
      videoWidth: 1080,
    }),
    { height: 768, width: 432 },
  );
});

test("desktop reel viewport is slightly wider than 9:16 so overlays do not crowd the video", () => {
  assert.equal(
    getReelContentWidth({
      height: 768,
      maxWidth: 560,
    }),
    504,
  );
});

test("desktop reel gives the video its full width without cutting the right side", () => {
  assert.equal(
    getReelVideoContentWidth({
      containerWidth: 504,
      isDesktopWeb: true,
    }),
    504,
  );
  assert.equal(
    getReelVideoContentWidth({
      containerWidth: 360,
      isDesktopWeb: false,
      viewportWidth: 360,
    }),
    360,
  );
});

test("compact web reel never grows wider than the phone viewport", () => {
  assert.equal(
    getReelVideoContentWidth({
      containerWidth: 420,
      isDesktopWeb: false,
      viewportWidth: 375,
    }),
    375,
  );
});

test("web video element is explicitly centered and contained without scaling", () => {
  assert.deepEqual(WEB_REEL_VIDEO_STYLE, {
    height: "100%",
    maxHeight: "100%",
    maxWidth: "100%",
    objectFit: "contain",
    objectPosition: "center center",
    transform: "none",
    width: "100%",
  });
});

test("web reel has equal top and bottom spacing while native keeps its shift", () => {
  assert.equal(
    getReelVideoVerticalShift({ isDesktopWeb: true, nativeShift: -20 }),
    0,
  );
  assert.equal(
    getReelVideoVerticalShift({ isDesktopWeb: false, nativeShift: -20 }),
    -20,
  );
});

test("web reel card applies loaded video metadata to its foreground frame", () => {
  assert.match(reelCardSource, /loadedmetadata/);
  assert.match(reelCardSource, /getContainedVideoSize/);
});

test("wide Web reel keeps its copy inside the empty space left of the video", () => {
  assert.equal(
    getReelDesktopCopyWidth({
      containerWidth: 1920,
      videoWidth: 508,
    }),
    560,
  );
  assert.equal(
    getReelDesktopCopyWidth({
      containerWidth: 1440,
      videoWidth: 810,
    }),
    283,
  );
});

test("compact Web reel keeps the mobile overlay when no side space is available", () => {
  assert.equal(
    getReelDesktopCopyWidth({
      containerWidth: 504,
      videoWidth: 432,
    }),
    null,
  );
});

test("Web reel copy truncates long captions and keeps actions on the right", () => {
  assert.match(reelCardSource, /ellipsizeMode="tail"[\s\S]{0,100}numberOfLines=\{2\}/);
  assert.match(reelCardSource, /desktopCopyWidth/);
  assert.match(reelCardSource, /flexBasis: desktopCopyWidth/);
  assert.match(reelCardSource, /desktopRail/);
});

test("Web video controls are centered at the foreground video width", () => {
  assert.match(reelCardSource, /desktopControlsWidth/);
  assert.match(reelCardSource, /styles\.desktopControlsPanel/);
  assert.match(reelCardSource, /width: desktopControlsWidth/);
});

test("reel detail uses the centered responsive desktop viewport", () => {
  assert.doesNotMatch(reelPreviewSource, /Dimensions/);
  assert.match(reelPreviewSource, /ResponsiveContent/);
  assert.match(reelPreviewSource, /getReelContentWidth/);
  assert.match(reelPreviewSource, /onLayout=/);
});
