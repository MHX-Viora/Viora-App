import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./desktop-header.tsx", import.meta.url), "utf8");

test("desktop header opens Google Play from the download badge beside the avatar", () => {
  assert.match(
    source,
    /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.ankt\.app/,
  );
  assert.match(source, /accessibilityLabel="Tải ANKT trên Google Play"/);
  assert.match(source, /Linking\.openURL\(GOOGLE_PLAY_URL\)/);
  assert.match(source, /onPress=\{openGooglePlay\}/);
  assert.match(source, /name="logo-google-playstore"/);
  assert.match(source, />TẢI XUỐNG TỪ<\/Text>/);
  assert.match(source, />Google Play<\/Text>/);
  assert.doesNotMatch(source, /router\.push\("\/download"\)/);
});
