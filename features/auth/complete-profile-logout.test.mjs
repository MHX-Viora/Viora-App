import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authService = readFileSync(
  new URL("../../services/auth.service.ts", import.meta.url),
  "utf8",
);
const completeProfileScreen = readFileSync(
  new URL("./complete-profile-screen.tsx", import.meta.url),
  "utf8",
);
const logoutDialog = readFileSync(
  new URL("./complete-profile-logout-dialog.tsx", import.meta.url),
  "utf8",
);
const normalizedLogoutDialog = logoutDialog.replace(/\s+/g, " ");

test("shared logout always clears local and Google authentication state", () => {
  assert.match(
    authService,
    /export const logout[\s\S]*=>\s*\{\s*try\s*\{\s*const token = await getAccessToken\(\)/,
  );
  assert.match(
    authService,
    /export const logout[\s\S]*finally\s*\{[\s\S]*clearGoogleAuthSession\(\)[\s\S]*clearSession\(\)/,
  );
});

test("profile completion offers a guarded logout confirmation and resets Login history", () => {
  assert.match(completeProfileScreen, />Thoát<\/Text>/);
  assert.match(logoutDialog, /Thoát tài khoản\?/);
  assert.match(
    normalizedLogoutDialog,
    /Thông tin bạn đang nhập chưa được hoàn tất\. Bạn có muốn đăng xuất để sử dụng tài khoản khác không\?/,
  );
  assert.match(logoutDialog, />Ở lại<\/Text>/);
  assert.match(logoutDialog, />Đăng xuất<\/Text>/);
  assert.match(completeProfileScreen, /isLoggingOutRef\.current/);
  assert.match(
    completeProfileScreen,
    /if \(router\.canDismiss\(\)\) \{\s*router\.dismissAll\(\);\s*\}\s*router\.replace\("\/login"\);/,
  );
});
