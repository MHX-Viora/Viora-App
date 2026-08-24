import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const screen = read("./complete-profile-screen.tsx");
const picker = read("../../components/auth/profile-photo-picker.tsx");
const dialog = read("./complete-profile-logout-dialog.tsx");

test("Complete Profile uses the shared auth visual language", () => {
  assert.match(screen, /<AuthBackground compact \/>/);
  assert.match(screen, /createStyles\(theme\)/);
  assert.match(screen, /backgroundColor: colors\.background/);
  assert.match(screen, /backgroundColor: colors\.surface/);
  assert.match(screen, /backgroundColor: colors\.surfaceElevated/);
  assert.match(screen, /backgroundColor: colors\.primarySoft/);
  assert.doesNotMatch(screen, /hex_F5F7FD|hex_E0EBFF|hex_071A38|hex_1239A6/);
});

test("profile photos and logout dialog support every app theme", () => {
  assert.match(picker, /backgroundColor: colors\.surfaceElevated/);
  assert.match(picker, /backgroundColor: colors\.primary/);
  assert.doesNotMatch(picker, /hex_DCE8FF|hex_0868D9|hex_60758B|hex_7A8496/);

  assert.match(dialog, /createStyles\(theme\)/);
  assert.match(dialog, /backgroundColor: colors\.overlay/);
  assert.doesNotMatch(dialog, /rgb_13_24_37_0_52|hex_101828/);
});
