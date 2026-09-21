import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stickerStore = readFileSync(
  new URL("../../app/sticker-store.tsx", import.meta.url),
  "utf8",
);

test("sticker packs use a responsive grid without stretching incomplete rows", () => {
  assert.match(stickerStore, /const \{ height: viewportHeight, isDesktopWeb, width: viewportWidth \} = useResponsive\(\)/);
  assert.match(stickerStore, /import \{ breakpoints \} from "@\/theme\/breakpoints"/);
  assert.match(
    stickerStore,
    /viewportWidth >= breakpoints\.largeDesktop \? 6 : viewportWidth >= breakpoints\.tablet \? 4 : 3/,
  );
  assert.match(stickerStore, /key=\{`sticker-grid-\$\{columnCount\}`\}/);
  assert.match(stickerStore, /numColumns=\{columnCount\}/);
  assert.match(stickerStore, /width: cardCellWidth/);
  assert.doesNotMatch(stickerStore, /card:\s*\{[^}]*flex:\s*1/);
});

test("desktop sticker pack previews use a compact centered dialog", () => {
  assert.match(stickerStore, /getResponsiveDialogLayout/);
  assert.match(stickerStore, /maxWidth: 720/);
  assert.match(stickerStore, /style=\{\[styles\.scrim, dialogLayout\.backdrop\]\}/);
  assert.match(stickerStore, /style=\{\[styles\.preview, dialogLayout\.surface\]\}/);
  assert.match(stickerStore, /previewSticker:\s*\{[^}]*maxWidth:\s*120/);
});

test("sticker pack previews scroll vertically and show four stickers per row", () => {
  assert.match(stickerStore, /const previewGridMaxHeight = Math\.max\(120, Math\.min\(360, viewportHeight \* 0\.48\)\)/);
  assert.match(stickerStore, /numColumns=\{4\}/);
  assert.match(stickerStore, /nestedScrollEnabled/);
  assert.match(stickerStore, /style=\{\[styles\.previewList, \{ maxHeight: previewGridMaxHeight \}\]\}/);
  assert.match(stickerStore, /previewStickerCell:\s*\{[^}]*width:\s*"25%"/);
  assert.match(stickerStore, /source=\{\{ uri: sticker\.thumbnailUrl \?\? sticker\.imageUrl \}\}/);
  assert.match(stickerStore, /<View style=\{\[styles\.scrim, dialogLayout\.backdrop\]\}>/);
  assert.match(stickerStore, /StyleSheet\.absoluteFill/);
});

test("sticker store reuses persisted metadata and image disk cache", () => {
  assert.match(stickerStore, /hydrateStickerCache\(chatLocalRepository, ownerId/);
  assert.match(stickerStore, /getStickerPackPageCache\(cacheKey\)/);
  assert.match(stickerStore, /setStickerPackPageCache\(cacheKey, page\)/);
  assert.match(stickerStore, /cachePolicy="memory-disk"/);
  assert.match(stickerStore, /previewPackIdRef\.current !== packId/);
});
