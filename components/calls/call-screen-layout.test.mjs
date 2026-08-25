import assert from "node:assert/strict";
import test from "node:test";

import { getCallSurfaceLayout } from "./call-screen-layout.ts";

test("desktop web call UI keeps the same phone-like proportions as the app", () => {
  assert.deepEqual(getCallSurfaceLayout({ isDesktopWeb: true }), {
    alignSelf: "center",
    maxWidth: 480,
    width: "100%",
  });
});

test("compact web and native calls fill the available phone viewport", () => {
  assert.deepEqual(getCallSurfaceLayout({ isDesktopWeb: false }), {
    width: "100%",
  });
});
