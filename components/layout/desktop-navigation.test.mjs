import assert from "node:assert/strict";
import test from "node:test";
import { desktopNavigationItems, getActiveDesktopRoute } from "./desktop-navigation.ts";

test("desktop navigation temporarily hides Utilities", () => {
  assert.deepEqual(
    desktopNavigationItems.map(({ route, title }) => ({ route, title })),
    [
      { route: "index", title: "Trang chủ" },
      { route: "chat", title: "Trò chuyện" },
      { route: "notification", title: "Thông báo" },
      { route: "profile", title: "Hồ sơ" },
    ],
  );
  assert.equal(desktopNavigationItems.some((item) => item.route === "reels"), false);
  assert.equal(desktopNavigationItems.some((item) => item.route === "utilities"), false);
});

test("desktop navigation maps tab state to an existing route", () => {
  assert.equal(getActiveDesktopRoute("chat"), "chat");
  assert.equal(getActiveDesktopRoute("unknown"), "index");
});
