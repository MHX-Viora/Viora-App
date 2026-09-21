import assert from "node:assert/strict";
import test from "node:test";
import { desktopNavigationItems, getActiveDesktopRoute } from "./desktop-navigation.ts";

test("desktop navigation exposes Utilities and keeps Reels hidden", () => {
  assert.deepEqual(
    desktopNavigationItems.map(({ route, title }) => ({ route, title })),
    [
      { route: "index", title: "Trang chủ" },
      { route: "chat", title: "Trò chuyện" },
      { route: "notification", title: "Thông báo" },
      { route: "utilities", title: "Tiện ích" },
      { route: "profile", title: "Hồ sơ" },
    ],
  );
  assert.equal(desktopNavigationItems.some((item) => item.route === "reels"), false);
  assert.equal(desktopNavigationItems.some((item) => item.route === "utilities"), true);
});

test("desktop navigation maps tab state to an existing route", () => {
  assert.equal(getActiveDesktopRoute("chat"), "chat");
  assert.equal(getActiveDesktopRoute("utilities"), "utilities");
  assert.equal(getActiveDesktopRoute("unknown"), "index");
});
