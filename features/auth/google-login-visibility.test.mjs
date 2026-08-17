import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const loginScreen = readFileSync(
  new URL("./login-screen.tsx", import.meta.url),
  "utf8",
);

assert.match(
  loginScreen,
  /const GOOGLE_LOGIN_ENABLED = true;/,
  "Google login must be enabled after the Google Play OAuth configuration is verified",
);
assert.match(
  loginScreen,
  /\{GOOGLE_LOGIN_ENABLED && \([\s\S]*accessibilityLabel="Đăng nhập bằng Google"[\s\S]*\)\}/,
  "The Google login controls must remain guarded by the release flag",
);
