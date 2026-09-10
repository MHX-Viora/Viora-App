import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./incoming-call-host.tsx", import.meta.url), "utf8");

test("incoming calls use the app call visuals inside a responsive web surface", () => {
  assert.match(source, /CallBackdrop/);
  assert.match(source, /CallAvatarHalo/);
  assert.match(source, /getCallSurfaceLayout/);
  assert.match(source, /styles\.modalBackdrop/);
  assert.match(source, /transparent=\{isDesktopWeb\}/);
  assert.match(source, /presentationStyle=\{isDesktopWeb \? "overFullScreen" : "fullScreen"\}/);
});

test("incoming call actions remain labelled for keyboard and screen-reader users", () => {
  assert.match(source, /accessibilityLabel="Từ chối cuộc gọi"/);
  assert.match(source, /accessibilityLabel="Nhận cuộc gọi"/);
});
