import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authService = readFileSync(new URL("./auth.service.ts", import.meta.url), "utf8");
const authenticatedFetch = readFileSync(new URL("./authenticated-fetch.ts", import.meta.url), "utf8");
const sessionStore = readFileSync(new URL("../stores/session-store.ts", import.meta.url), "utf8");
const rootLayout = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");

test("native refresh sends its stored token while Web can keep using the HttpOnly cookie", () => {
  assert.match(authService, /getRefreshToken\(\)/);
  assert.match(authService, /refreshToken:\s*storedRefreshToken/);
  assert.match(authService, /credentials:\s*["']include["']/);
});

test("a successful refresh persists both rotated tokens", () => {
  assert.match(authenticatedFetch, /setAuthTokens\(refreshedSession\)/);
  assert.match(sessionStore, /setRefreshToken\(tokens\.refreshToken\)/);
});

test("an invalid refresh clears authentication while a transient failure remains recoverable", () => {
  assert.match(authenticatedFetch, /error instanceof InvalidRefreshTokenError/);
  assert.match(authenticatedFetch, /clearSession\(\)/);
});

test("startup validates or refreshes the token before authenticated synchronization", () => {
  assert.match(rootLayout, /ensureFreshSession\(\)/);
  assert.match(rootLayout, /await ensureFreshSession\(\)/);
});

test("refresh relies on live SignalR token factories without forcing reconnects", () => {
  const realtime = readFileSync(new URL("./realtime.service.ts", import.meta.url), "utf8");
  const callRealtime = readFileSync(new URL("./call-realtime.service.ts", import.meta.url), "utf8");
  assert.doesNotMatch(authenticatedFetch, /restartRealtime/);
  assert.match(realtime, /accessTokenFactory:[\s\S]{0,160}getRealtimeAccessToken\(\)/);
  assert.match(callRealtime, /accessTokenFactory:[\s\S]{0,120}getAccessToken\(\)/);
});
