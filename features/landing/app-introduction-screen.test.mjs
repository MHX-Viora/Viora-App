import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const screenSource = await readFile(
  new URL("./app-introduction-screen.tsx", import.meta.url),
  "utf8",
);
const routeSource = await readFile(
  new URL("../../app/download.tsx", import.meta.url),
  "utf8",
);
const rootLayoutSource = await readFile(
  new URL("../../app/_layout.tsx", import.meta.url),
  "utf8",
);
const showcaseSource = await readFile(
  new URL("../../components/landing/app-showcase.tsx", import.meta.url),
  "utf8",
);

test("Google Play opens only from the download action", () => {
  assert.match(
    screenSource,
    /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.ankt\.app/,
  );
  assert.match(screenSource, /Linking\.openURL\(GOOGLE_PLAY_URL\)/);
  assert.match(screenSource, /onPress=\{openGooglePlay\}/);
});

test("the introduction route is temporarily hidden on every platform", () => {
  assert.match(routeSource, /<Redirect href="\/"/);
  assert.doesNotMatch(routeSource, /AppIntroductionScreen/);
  assert.doesNotMatch(routeSource, /Platform\.OS/);
});

test("the hidden download route no longer bypasses authentication", () => {
  assert.doesNotMatch(rootLayoutSource, /currentRoute === "download"/);
});

test("the app showcase shrinks inside narrow web viewports", () => {
  assert.match(showcaseSource, /compact && styles\.phoneCompact/);
  assert.match(showcaseSource, /stageCompact: \{[^}]*width: "100%"/);
  assert.match(showcaseSource, /phoneCompact: \{[^}]*maxWidth: 300[^}]*width: "92%"/);
});
