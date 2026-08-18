import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./conversation-settings-screen.tsx", import.meta.url),
  "utf8",
);

assert.match(
  source,
  /setGroupShareLink\(link\.shareUrl\)/,
  "Group sharing must use the canonical share URL returned by the backend",
);
assert.doesNotMatch(
  source,
  /nativePreviewLink/,
  "Group sharing must not replace the backend URL with a custom-scheme link",
);
assert.doesNotMatch(
  source,
  /shareLinkInput/,
  "Group sharing must not render the raw link in a text field",
);
