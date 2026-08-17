import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const helper = readFileSync(
  new URL("../services/qr-image-scanner.ts", import.meta.url),
  "utf8",
);
assert.match(helper, /launchImageLibraryAsync/);
assert.match(helper, /scanFromURLAsync\([^,]+,\s*\["qr"\]\)/);

for (const path of [
  "../components/profile/profile-qr-modal.tsx",
  "./chat/conversations-screen.tsx",
]) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(source, /scanQrFromDeviceImage/);
  assert.match(source, /Chọn ảnh QR/);
}
