import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APP_LAUNCH_ARTWORK_ASPECT_RATIO,
  APP_LAUNCH_ARTWORK_WIDTH,
} from "./app-launch-layout.ts";

test("launch artwork keeps horizontal safe space so the full logo is visible", () => {
  assert.equal(APP_LAUNCH_ARTWORK_WIDTH, "88%");
  assert.equal(APP_LAUNCH_ARTWORK_ASPECT_RATIO, 3 / 2);
});

test("launch artwork uses the native contain renderer on Android", () => {
  const source = readFileSync(
    new URL("./app-launch-screen.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /import \{ Image, StyleSheet, View \} from "react-native"/);
  assert.match(source, /resizeMode="contain"/);
  assert.match(source, /ankt_launch_safe\.png/);
  assert.doesNotMatch(source, /from "expo-image"/);
});
