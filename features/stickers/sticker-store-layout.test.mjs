import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stickerStore = readFileSync(
  new URL("../../app/sticker-store.tsx", import.meta.url),
  "utf8",
);

test("sticker packs use a responsive grid without stretching incomplete rows", () => {
  assert.match(stickerStore, /const \{ height: viewportHeight, isDesktopWeb, isWeb, width: viewportWidth \} = useResponsive\(\)/);
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
  assert.match(stickerStore, /const previewStickerSize = isWeb/);
  assert.match(stickerStore, /\? 120/);
});

test("native sticker pack previews reserve a visible scroll area and show three stickers per row", () => {
  assert.match(stickerStore, /const previewGridMaxHeight = Math\.max\(120, Math\.min\(360, viewportHeight \* 0\.48\)\)/);
  assert.match(stickerStore, /Math\.floor\(\(viewportWidth - spacing\.md \* 2\) \/ 3\)/);
  assert.match(stickerStore, /style=\{\[styles\.previewScroll, \{ maxHeight: previewGridMaxHeight \}\]\}/);
  assert.match(stickerStore, /height: previewStickerSize, width: previewStickerSize/);
  assert.match(stickerStore, /source=\{\{ uri: sticker\.thumbnailUrl \?\? sticker\.imageUrl \}\}/);
  assert.match(stickerStore, /previewScroll:\s*\{ flexGrow: 0 \}/);
});

test("sticker store reuses persisted metadata and image disk cache", () => {
  assert.match(stickerStore, /hydrateStickerCache\(\)/);
  assert.match(stickerStore, /getStickerPackPageCache\(cacheKey\)/);
  assert.match(stickerStore, /setStickerPackPageCache\(cacheKey, page\)/);
  assert.match(stickerStore, /cachePolicy="memory-disk"/);
  assert.match(stickerStore, /previewPackIdRef\.current !== packId/);
});
