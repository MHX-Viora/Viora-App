import assert from "node:assert/strict";
import test from "node:test";

import { isJwtExpiringSoon } from "./jwt-expiry.ts";

const tokenWithExpiration = (expiration) => {
  const payload = Buffer.from(JSON.stringify({ exp: expiration }))
    .toString("base64url");
  return `header.${payload}.signature`;
};

test("JWT is considered expiring inside the refresh window", () => {
  assert.equal(isJwtExpiringSoon(tokenWithExpiration(1_060), 1_000, 60), true);
  assert.equal(isJwtExpiringSoon(tokenWithExpiration(1_061), 1_000, 60), false);
});

test("malformed JWT does not force a refresh loop", () => {
  assert.equal(isJwtExpiringSoon("invalid-token", 1_000, 60), false);
});
