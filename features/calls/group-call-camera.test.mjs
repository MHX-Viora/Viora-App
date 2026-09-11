import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const groupCallScreen = readFileSync(
  new URL("./group-call-screen.tsx", import.meta.url),
  "utf8",
);

test("group calls restart the published video track when switching cameras", () => {
  assert.match(
    groupCallScreen,
    /getTrackPublication\([\s\S]*Track\.Source\.Camera[\s\S]*\)\?\.videoTrack[\s\S]*restartTrack\(\{[\s\S]*facingMode:/,
  );
  assert.doesNotMatch(
    groupCallScreen,
    /switchCamera[\s\S]*setCameraEnabled\(false\)[\s\S]*setCameraEnabled\(true/,
  );
  assert.match(
    groupCallScreen,
    /mirror=\{item\.participant\.isLocal && isFrontCamera\}/,
  );
});

test("group camera switching reports failures instead of rejecting silently", () => {
  assert.match(
    groupCallScreen,
    /const switchCamera = async[\s\S]*try \{[\s\S]*catch \(error\)[\s\S]*Alert\.alert\(/,
  );
});
