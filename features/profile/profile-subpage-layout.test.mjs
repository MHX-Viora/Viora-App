import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { layout } from "../../theme/layout.ts";

const routeFiles = [
  "../../app/account-settings.tsx",
  "../../app/change-password.tsx",
  "../../app/edit-profile.tsx",
  "../../app/friends.tsx",
  "../../app/legal/[type].tsx",
  "../../app/policies-terms.tsx",
  "../../app/profile-activity.tsx",
  "../../app/support.tsx",
];

test("profile settings and friends routes use one centered desktop width", () => {
  assert.equal(layout.profileSubpageMaxWidth, 760);

  for (const routeFile of routeFiles) {
    const source = readFileSync(new URL(routeFile, import.meta.url), "utf8");
    assert.match(source, /ResponsiveContent/);
    assert.match(source, /layout\.profileSubpageMaxWidth/);
  }
});
