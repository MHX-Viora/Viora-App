import assert from "node:assert/strict";
import test from "node:test";

import { getBreakpoint, isDesktopWebLayout } from "./breakpoints.ts";
import { layout } from "./layout.ts";

test("breakpoints classify every boundary consistently", () => {
  assert.equal(getBreakpoint(320), "mobile");
  assert.equal(getBreakpoint(767), "mobile");
  assert.equal(getBreakpoint(768), "tablet");
  assert.equal(getBreakpoint(1023), "tablet");
  assert.equal(getBreakpoint(1024), "desktop");
  assert.equal(getBreakpoint(1439), "desktop");
  assert.equal(getBreakpoint(1440), "largeDesktop");
});

test("invalid widths use the conservative mobile layout", () => {
  assert.equal(getBreakpoint(-1), "mobile");
  assert.equal(getBreakpoint(Number.NaN), "mobile");
});

test("desktop content widths are centralized and ordered", () => {
  assert.ok(layout.feedMaxWidth < layout.notificationMaxWidth);
  assert.ok(layout.feedMaxWidth < layout.profileMaxWidth);
  assert.ok(layout.profileMaxWidth < layout.notificationMaxWidth);
  assert.equal(layout.articleMaxWidth, 760);
  assert.equal(layout.articleMediaMaxWidth, 720);
  assert.ok(layout.articleMediaMaxWidth < layout.articleMaxWidth);
  assert.equal(layout.desktopHeaderHeight, 64);
});

test("desktop Web layout waits until hydration to match server markup", () => {
  assert.equal(
    isDesktopWebLayout({ hasMounted: false, isWeb: true, width: 1440 }),
    false,
  );
  assert.equal(
    isDesktopWebLayout({ hasMounted: true, isWeb: true, width: 1440 }),
    true,
  );
  assert.equal(
    isDesktopWebLayout({ hasMounted: true, isWeb: false, width: 1440 }),
    false,
  );
});
