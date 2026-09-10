import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DEFAULT_THEME_MODE, normalizeThemeMode } from "./theme-mode.ts";

const catalogSource = readFileSync(new URL("./theme-catalog.ts", import.meta.url), "utf8");
const premiumOceanSource = readFileSync(new URL("./premium-ocean.ts", import.meta.url), "utf8");
const providerSource = readFileSync(new URL("./theme-provider.tsx", import.meta.url), "utf8");
const pickerSource = readFileSync(new URL("../components/profile/theme-mode-sheet.tsx", import.meta.url), "utf8");
const chatSource = readFileSync(new URL("../features/chat/chat-screen.tsx", import.meta.url), "utf8");

const luminance = (hex) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrast = (foreground, background) => {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

test("Ocean is an extensible selectable theme without premium labelling", () => {
  assert.match(
    catalogSource,
    /"premium-ocean":\s*\{[\s\S]*?name:\s*"Ocean"/,
  );
  assert.doesNotMatch(catalogSource, /premium:|requiresPremium/);
});

test("Modern remains the default and Premium Ocean is a valid stored mode", () => {
  assert.equal(DEFAULT_THEME_MODE, "modern");
  assert.equal(normalizeThemeMode("premium-ocean"), "premium-ocean");
});

test("Premium Ocean exposes restrained ocean gradients and semantic status colors", () => {
  assert.match(premiumOceanSource, /primary:\s*\["#19D8C4",\s*"#13B9D0",\s*"#168FE5"\]/);
  assert.match(premiumOceanSource, /background:\s*"#06182A"/);
  assert.match(premiumOceanSource, /surface:\s*"#0C2036"/);
  assert.match(premiumOceanSource, /warning:\s*"#F4C95D"/);
});

test("Premium Ocean buttons and outgoing messages meet AA text contrast", () => {
  assert.match(premiumOceanSource, /primaryContrast:\s*"#06182A"/);
  assert.match(premiumOceanSource, /messageMineText:\s*"#F5FAFF"/);
  assert.match(premiumOceanSource, /messageMineMuted:\s*"#BFD3E4"/);
  assert.match(premiumOceanSource, /dangerContrast:\s*"#06182A"/);
  assert.match(premiumOceanSource, /successContrast:\s*"#06182A"/);
  assert.match(premiumOceanSource, /verifiedContrast:\s*"#06182A"/);
  assert.match(
    premiumOceanSource,
    /messageMine:\s*\["#0B5967",\s*"#0D456E"\]/,
  );
  assert.ok(contrast("#06182A", "#13C8C5") >= 4.5);
  assert.ok(contrast("#F5FAFF", "#0B5967") >= 4.5);
  assert.ok(contrast("#F5FAFF", "#0D456E") >= 4.5);
  assert.ok(contrast("#BFD3E4", "#0B5967") >= 4.5);
  assert.ok(contrast("#BFD3E4", "#0D456E") >= 4.5);
  assert.ok(contrast("#06182A", "#FF6178") >= 4.5);
  assert.ok(contrast("#06182A", "#24D6A2") >= 4.5);
  assert.ok(contrast("#06182A", "#159FE3") >= 4.5);
  assert.match(chatSource, /mineText:\s*\{ color: colors\.messageMineText \}/);
  assert.match(chatSource, /mineTime:\s*\{ color: colors\.messageMineMuted \}/);
  assert.match(
    chatSource,
    /newMessageText:\s*\{\s*color: colors\.primaryContrast/,
  );
  assert.match(
    chatSource,
    /activeGroupCallIcon[\s\S]*?<Ionicons color=\{colors\.primaryContrast\}/,
  );
  assert.match(
    chatSource,
    /<Ionicons color=\{colors\.primaryContrast\} name="send"/,
  );
});

test("theme hydration restores every valid theme before rendering app content", () => {
  assert.match(providerSource, /setModeState\(normalizeThemeMode\(value\)\)/);
  assert.doesNotMatch(providerSource, /isThemeUnlocked|unlockedThemeModes/);
  assert.match(providerSource, /if \(!isHydrated\)\s*\{?\s*return/);
});

test("appearance picker lets users select every catalog theme", () => {
  assert.match(pickerSource, /themeCatalog\.map/);
  assert.match(pickerSource, /previewNavigation/);
  assert.match(pickerSource, /accessibilityRole="radio"/);
  assert.doesNotMatch(
    pickerSource,
    /premiumBadge|PREMIUM|isThemeUnlocked|lock-closed|Alert\.alert/,
  );
});

test("chat send action and outgoing bubbles avoid unclipped gradient layers", () => {
  assert.doesNotMatch(chatSource, /ThemeGradientLayer/);
  assert.doesNotMatch(chatSource, /theme\.gradients\.(?:primary|messageMine)/);
});
