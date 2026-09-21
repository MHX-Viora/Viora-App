import assert from "node:assert/strict";
import test from "node:test";

import { parseUserResponse } from "./profile-response.ts";

const response = {
  id: "d66ab434-4fcf-4b47-8791-b62a44eb0b26",
  accountId: "366406e5-4b06-4b8d-b070-e288f68c8663",
  displayName: "KaKa",
  avatarUrl: null,
  coverUrl: null,
  gender: 0,
  role: 0,
  isVerified: false,
  verificationStatus: 0,
  accountStyle: 0,
};

test("accepts the direct backend UserResponse with zero, false and null values", () => {
  assert.deepEqual(parseUserResponse(response), {
    ...response,
    avatarUrl: "",
    coverUrl: "",
  });
});

test("preserves updated names and uploaded image URLs", () => {
  assert.deepEqual(parseUserResponse({
    ...response,
    displayName: "KaiKa",
    avatarUrl: "https://example.com/avatar.jpg",
    coverUrl: "https://example.com/cover.jpg",
  }), {
    ...response,
    displayName: "KaiKa",
    avatarUrl: "https://example.com/avatar.jpg",
    coverUrl: "https://example.com/cover.jpg",
  });
});

test("rejects missing required fields and wrapped responses", () => {
  assert.equal(parseUserResponse({ ...response, accountId: null }), null);
  assert.equal(parseUserResponse({ ...response, isVerified: undefined }), null);
  assert.equal(parseUserResponse({ user: response }), null);
});
