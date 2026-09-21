import assert from "node:assert/strict";
import test from "node:test";

import { withUpdatedUser } from "./session-user.ts";

const user = {
  id: "user-id", accountId: "account-id", displayName: "KaKa",
  avatarUrl: "", coverUrl: "", gender: 0, role: 0,
  isVerified: false, verificationStatus: 0, accountStyle: 0,
};

test("profile updates keep the authenticated session and merge all user fields", () => {
  const session = { accessToken: "access-token", user: { ...user, customField: "kept" } };
  const updated = withUpdatedUser(session, {
    ...user, displayName: "KaiKa", avatarUrl: "https://example.com/avatar.jpg",
  });
  assert.equal(updated.accessToken, "access-token");
  assert.equal(updated.user.displayName, "KaiKa");
  assert.equal(updated.user.avatarUrl, "https://example.com/avatar.jpg");
  assert.equal(updated.user.customField, "kept");

  const updatedAgain = withUpdatedUser(updated, { ...user, displayName: "KaKa" });
  assert.equal(updatedAgain.user.displayName, "KaKa");
  assert.equal(updatedAgain.accessToken, "access-token");
});

test("completion fills a session without losing its token", () => {
  const updated = withUpdatedUser({ accessToken: "access-token", user: null }, user);
  assert.equal(updated.user.id, "user-id");
  assert.equal(updated.accessToken, "access-token");
});
