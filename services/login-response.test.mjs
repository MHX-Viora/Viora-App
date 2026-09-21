import assert from "node:assert/strict";
import test from "node:test";

import { normalizeLoginResponse } from "./login-response.ts";

test("new Google account with no User goes to profile completion", () => {
  const session = normalizeLoginResponse({ accessToken: "token", user: null });
  assert.equal(session.accessToken, "token");
  assert.equal(session.user, null);
});

test("existing Google user remains authenticated after a later login", () => {
  const session = normalizeLoginResponse({
    accessToken: "new-token",
    user: {
      id: "user-id", accountId: "account-id", displayName: "KaKa",
      avatarUrl: null, coverUrl: null, gender: 0, role: 0,
      isVerified: false, verificationStatus: 0, accountStyle: 0,
    },
  });
  assert.equal(session.user.id, "user-id");
  assert.equal(session.user.gender, 0);
  assert.equal(session.user.avatarUrl, "");
});
