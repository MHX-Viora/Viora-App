import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../services/incoming-call-notification.service.ts", import.meta.url),
  "utf8",
);

assert.doesNotMatch(
  source,
  /fullScreenAction:\s*shouldUseFullScreenCallAction/,
  "Background handlers must not infer foreground state before attaching the full-screen action",
);
assert.match(
  source,
  /fullScreenAction:\s*\{[\s\S]*?launchActivity:\s*"default"/,
  "Incoming-call notifications must always carry a full-screen Android action",
);
