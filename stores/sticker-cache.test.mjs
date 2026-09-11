import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MAX_STICKER_DETAIL_CACHE_ENTRIES,
  MAX_STICKER_PAGE_CACHE_ENTRIES,
  STICKER_CACHE_TTL_MS,
  clearStickerCacheMemory,
  getStickerPackDetailCache,
  getStickerPackPageCache,
  isStickerCacheStale,
  setStickerPackDetailCache,
  setStickerPackPageCache,
  stickerPackPageKey,
} from "./sticker-cache.ts";

const stickerService = readFileSync(new URL("../services/sticker.service.ts", import.meta.url), "utf8");

const pack = { id: "pack-1", name: "Pack", thumbnailUrl: "https://img/pack.png" };
const detail = { pack, stickers: [{ id: "sticker-1", imageUrl: "https://img/1.png" }] };

test("sticker metadata cache keys list queries and pack details independently", () => {
  clearStickerCacheMemory();
  const pageKey = stickerPackPageKey("usable", 1, 50);
  setStickerPackPageCache(pageKey, { items: [pack], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 }, 100);
  setStickerPackDetailCache("pack-1", detail, 200);

  assert.equal(getStickerPackPageCache(pageKey)?.value.items[0].id, "pack-1");
  assert.equal(getStickerPackDetailCache("pack-1")?.value.stickers[0].id, "sticker-1");
});

test("sticker metadata stays fresh for sixty minutes", () => {
  const cachedAt = 1_000;
  assert.equal(isStickerCacheStale({ cachedAt, value: null }, cachedAt + STICKER_CACHE_TTL_MS - 1), false);
  assert.equal(isStickerCacheStale({ cachedAt, value: null }, cachedAt + STICKER_CACHE_TTL_MS), true);
});

test("sticker metadata cache evicts the oldest entries", () => {
  clearStickerCacheMemory();
  for (let index = 0; index <= MAX_STICKER_PAGE_CACHE_ENTRIES; index += 1) {
    setStickerPackPageCache(`page-${index}`, { items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 1 }, index);
  }
  for (let index = 0; index <= MAX_STICKER_DETAIL_CACHE_ENTRIES; index += 1) {
    setStickerPackDetailCache(`pack-${index}`, detail, index);
  }

  assert.equal(getStickerPackPageCache("page-0"), undefined);
  assert.equal(getStickerPackDetailCache("pack-0"), undefined);
});

test("sticker HTTP requests are single-flight by list query and detail ID", () => {
  assert.match(stickerService, /stickerRequests\.run\(`packs:\$\{type\}:\$\{page\}:\$\{pageSize\}`/);
  assert.match(stickerService, /stickerRequests\.run\(`pack:\$\{id\}`/);
});
