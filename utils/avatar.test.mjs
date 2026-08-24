import assert from "node:assert/strict";
import test from "node:test";
import { getAvatarInitial } from "./avatar.ts";

test("uses the first trimmed character as the avatar initial", () => {
  assert.equal(getAvatarInitial("  Nguyễn Hiếu "), "N");
});

test("upper-cases Vietnamese initials", () => {
  assert.equal(getAvatarInitial("đức"), "Đ");
});

test("never returns an empty fallback", () => {
  assert.equal(getAvatarInitial(""), "?");
  assert.equal(getAvatarInitial(null), "?");
  assert.equal(getAvatarInitial(undefined), "?");
});
