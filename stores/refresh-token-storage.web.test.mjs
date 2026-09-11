import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { refreshTokenStorage } from "./refresh-token-storage.web.ts";
import { refreshTokenTransportHeaders as webTransportHeaders } from "../services/refresh-token-transport.web.ts";

test("Web never persists refresh tokens in browser-readable storage", async () => {
  await refreshTokenStorage.setAsync("secret-refresh-token");
  assert.equal(await refreshTokenStorage.getAsync(), null);
});

test("native refresh tokens use SecureStore rather than AsyncStorage", () => {
  const source = readFileSync(
    new URL("./refresh-token-storage.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /expo-secure-store/);
  assert.doesNotMatch(source, /AsyncStorage|localStorage|sessionStorage/);
});

test("only native requests opt into refresh-token response bodies", () => {
  const nativeSource = readFileSync(
    new URL("../services/refresh-token-transport.ts", import.meta.url),
    "utf8",
  );
  assert.deepEqual(webTransportHeaders, {});
  assert.match(nativeSource, /X-ANKT-Refresh-Token["']:\s*["']body/);
});
