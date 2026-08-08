import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const loginScreen = readFileSync(
  new URL("./login-screen.tsx", import.meta.url),
  "utf8",
);

assert.match(
  loginScreen,
  /const GOOGLE_LOGIN_ENABLED = false;/,
  "Google login must remain disabled until the Google Play OAuth configuration is verified",
);
assert.match(
  loginScreen,
  /\{GOOGLE_LOGIN_ENABLED && \([\s\S]*accessibilityLabel="Đăng nhập bằng Google"[\s\S]*\)\}/,
  "The Google login controls must be hidden behind the release safeguard",
);
