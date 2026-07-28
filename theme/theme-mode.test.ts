import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

// @ts-expect-error Node's type-stripping runner requires the TS extension.
import { DEFAULT_THEME_MODE, THEME_STORAGE_KEY, normalizeThemeMode } from "./theme-mode.ts";

test("uses the requested AsyncStorage key", () => {
  assert.equal(THEME_STORAGE_KEY, "theme_mode");
});

test("accepts supported persisted theme modes", () => {
  assert.equal(normalizeThemeMode("modern"), "modern");
  assert.equal(normalizeThemeMode("classic"), "classic");
});

test("falls back to Modern for missing or unknown values", () => {
  assert.equal(normalizeThemeMode(null), DEFAULT_THEME_MODE);
  assert.equal(normalizeThemeMode("amoled"), DEFAULT_THEME_MODE);
});

test("uses the Version 1 classic Facebook-style palette", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "theme", "classic.ts"),
    "utf8",
  );
  for (const token of [
    'background: "#F0F2F5"',
    'surfaceElevated: "#FFFFFF"',
    'secondaryBackground: "#E4E6EB"',
    'primary: "#1877F2"',
    'text: "#050505"',
    'textMuted: "#65676B"',
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("keeps Classic overlays and actions visible instead of white-on-white", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "theme", "visuals.ts"),
    "utf8",
  );
  for (const token of [
    'hex_0868D9: "#1877F2"',
    'rgb_14_28_49_0_94: "#1877F2"',
    'rgb_15_23_42_0_72: "#1877F2"',
    'rgb_13_24_37_0_52: "rgba(0, 0, 0, 0.32)"',
    'rgb_15_23_42_0_45: "rgba(0, 0, 0, 0.32)"',
    'rgb_152_80_232_0_56: "#DADDE1"',
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("uses a dark flat Classic palette for Reels controls", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "theme", "classic.ts"),
    "utf8",
  );
  for (const token of [
    "const classicReelsColors: ThemeColors",
    'background: "#101820"',
    'surfaceElevated: "#263442"',
    'text: "#FFFFFF"',
    "reels: classicReelsColors",
    "notifications: classicNotificationColors",
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("QR codes keep a dark foreground on a white background in Classic", () => {
  const classicSource = fs.readFileSync(
    path.join(process.cwd(), "theme", "classic.ts"),
    "utf8",
  );
  const profileQrSource = fs.readFileSync(
    path.join(process.cwd(), "components", "profile", "profile-qr-modal.tsx"),
    "utf8",
  );
  const groupQrSource = fs.readFileSync(
    path.join(process.cwd(), "features", "chat", "conversation-settings-screen.tsx"),
    "utf8",
  );

  assert.match(classicSource, /qrBackground: "#FFFFFF"/);
  assert.match(classicSource, /qrForeground: "#111111"/);
  assert.match(profileQrSource, /backgroundColor=\{colors\.qrBackground\}/);
  assert.match(profileQrSource, /color=\{colors\.qrForeground\}/);
  assert.match(groupQrSource, /backgroundColor=\{colors\.qrBackground\}/);
  assert.match(groupQrSource, /color=\{colors\.qrForeground\}/);
});

test("Classic chat uses white incoming and light-blue outgoing bubbles", () => {
  const classicSource = fs.readFileSync(
    path.join(process.cwd(), "theme", "classic.ts"),
    "utf8",
  );
  const chatSource = fs.readFileSync(
    path.join(process.cwd(), "features", "chat", "chat-screen.tsx"),
    "utf8",
  );

  assert.match(classicSource, /messageMine: "#E7F3FF"/);
  assert.match(classicSource, /messageOther: "#FFFFFF"/);
  assert.match(chatSource, /mineBubble:[\s\S]*backgroundColor: colors\.messageMine/);
  assert.match(chatSource, /theirBubble:[\s\S]*backgroundColor: colors\.messageOther/);
});

test("profile activity clears the floating tab bar and call status stays readable", () => {
  const activitySource = fs.readFileSync(
    path.join(process.cwd(), "features", "profile", "profile-activity-screen.tsx"),
    "utf8",
  );
  const callSource = fs.readFileSync(
    path.join(process.cwd(), "features", "calls", "voice-call-screen.tsx"),
    "utf8",
  );

  assert.match(activitySource, /TAB_BAR_BOTTOM \+ TAB_BAR_HEIGHT/);
  assert.match(activitySource, /paddingBottom: listBottomPadding/);
  assert.match(callSource, /videoHeaderStatus:[\s\S]*color: colors\.textMuted/);
});

test("main profile content clears the floating bottom tab bar", () => {
  const profileSource = fs.readFileSync(
    path.join(process.cwd(), "features", "profile", "profile-screen.tsx"),
    "utf8",
  );

  assert.match(profileSource, /TAB_BAR_BOTTOM \+ TAB_BAR_HEIGHT/);
  assert.match(profileSource, /paddingBottom: profileBottomPadding/);
});
