import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stickerPanel = readFileSync(
  new URL("./sticker-panel.tsx", import.meta.url),
  "utf8",
);

test("web sticker picker uses compact controls and fixed-size sticker cells", () => {
  assert.match(stickerPanel, /const \{ isWeb \} = useResponsive\(\)/);
  assert.match(stickerPanel, /styles\.webStickerButton/);
  assert.match(stickerPanel, /styles\.webSticker/);
  assert.match(stickerPanel, /styles\.webTab/);
  assert.match(stickerPanel, /webSticker:\s*\{ height: 56, width: 56 \}/);
  assert.match(stickerPanel, /webStickerButton:\s*\{ padding: spacing\.xs, width: 64 \}/);
  assert.match(stickerPanel, /webTab:\s*\{ minHeight: 40, minWidth: 40 \}/);
});

test("sticker picker renders cached metadata before background revalidation", () => {
  assert.match(stickerPanel, /getStickerPackPageCache\(USABLE_PACKS_KEY\)/);
  assert.match(stickerPanel, /hydrateStickerCache\(chatLocalRepository, ownerId/);
  assert.match(stickerPanel, /isStickerCacheStale\(cached\)/);
  assert.match(stickerPanel, /cachePolicy="memory-disk"/);
  assert.match(stickerPanel, /detailLoading && detail === null/);
});
