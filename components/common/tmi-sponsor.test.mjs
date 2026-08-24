import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const componentUrl = new URL("./tmi-sponsor.tsx", import.meta.url);
const assetUrl = new URL("../../assets/images/tmi-cns-logo.png", import.meta.url);
const loginSource = readFileSync(
  new URL("../../features/auth/login-screen.tsx", import.meta.url),
  "utf8",
);
const settingsSource = readFileSync(
  new URL("../profile/profile-settings-sheet.tsx", import.meta.url),
  "utf8",
);

test("TMI sponsor component places the supplied logo above the credit text", () => {
  assert.equal(existsSync(componentUrl), true);
  assert.equal(existsSync(assetUrl), true);

  const componentSource = readFileSync(componentUrl, "utf8");
  const logoIndex = componentSource.indexOf("<Image");
  const textIndex = componentSource.indexOf("Phát triển và bảo trợ bởi TMI");

  assert.ok(logoIndex >= 0);
  assert.ok(textIndex > logoIndex);
  assert.match(componentSource, /contentFit="contain"/);
  assert.match(componentSource, /accessibilityLabel="Logo CNS"/);
});

test("all current sponsor placements use the shared component", () => {
  for (const source of [loginSource, settingsSource]) {
    assert.match(source, /import \{ TmiSponsor \}/);
    assert.match(source, /<TmiSponsor\b[^>]*\/>/);
    assert.doesNotMatch(source, />Phát triển và bảo trợ bởi TMI</);
  }
});
