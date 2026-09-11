import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const headerSource = await readFile(
  new URL("./desktop-header.tsx", import.meta.url),
  "utf8",
);
const promoSource = await readFile(
  new URL("../landing/desktop-download-promo.tsx", import.meta.url),
  "utf8",
);

test("desktop header leaves introduction and download promotion to the right rail", () => {
  assert.doesNotMatch(headerSource, /GOOGLE_PLAY_URL/);
  assert.doesNotMatch(headerSource, /router\.push\("\/download"\)/);
  assert.doesNotMatch(headerSource, /playStoreButton/);
});

test("desktop right rail shows the ANKT Google Play promotion card", () => {
  assert.match(
    promoSource,
    /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.ankt\.app/,
  );
  assert.match(promoSource, /Linking\.openURL\(GOOGLE_PLAY_URL\)/);
  assert.match(promoSource, /getFeedDownloadPromoLayout/);
  assert.match(promoSource, /Khám phá thêm nội dung/);
  assert.match(promoSource, /Tải ngay trên Google Play/);
  assert.match(promoSource, /name="logo-google-playstore"/);
});
