import assert from "node:assert/strict";
import test from "node:test";

import { parseUserResponse } from "./profile-response.ts";

const response = {
  id: "user-id",
  accountId: "account-id",
  displayName: "KaKa",
  avatarUrl: null,
  coverUrl: null,
  gender: 0,
  role: 0,
  isVerified: false,
  verificationStatus: 0,
  accountStyle: 0,
};

test("accepts direct PATCH UserResponse with zero, false and null values", () => {
  assert.deepEqual(parseUserResponse(response), {
    ...response,
    avatarUrl: "",
    coverUrl: "",
  });
});

test("rejects wrapped or incomplete profile responses", () => {
  assert.equal(parseUserResponse({ data: response }), null);
  assert.equal(parseUserResponse({ ...response, accountId: null }), null);
});
