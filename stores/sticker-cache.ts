import AsyncStorage from "@react-native-async-storage/async-storage";

import type { StickerPackDetail, StickerPackPage } from "@/types/sticker";

const STORAGE_KEY = "ankt.stickers.metadata.v1";
export const STICKER_CACHE_TTL_MS = 60 * 60 * 1_000;
export const MAX_STICKER_PAGE_CACHE_ENTRIES = 12;
export const MAX_STICKER_DETAIL_CACHE_ENTRIES = 48;

type CacheEntry<T> = {
  cachedAt: number;
  value: T;
};

type StickerCacheSnapshot = {
  details: [string, CacheEntry<StickerPackDetail>][];
  pages: [string, CacheEntry<StickerPackPage>][];
  version: 1;
};

const pages = new Map<string, CacheEntry<StickerPackPage>>();
const details = new Map<string, CacheEntry<StickerPackDetail>>();
let hydrationPromise: Promise<void> | null = null;
let persistPromise = Promise.resolve();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCachePair = (value: unknown) =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === "string" &&
  isRecord(value[1]) &&
  typeof value[1].cachedAt === "number" &&
  isRecord(value[1].value);

const parseSnapshot = (raw: string | null): StickerCacheSnapshot | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      !Array.isArray(value.pages) ||
      !value.pages.every(isCachePair) ||
      !Array.isArray(value.details) ||
      !value.details.every(isCachePair)
    ) {
      return null;
    }
    return value as StickerCacheSnapshot;
  } catch {
    return null;
  }
};

const snapshot = (): StickerCacheSnapshot => ({
  details: [...details.entries()],
  pages: [...pages.entries()],
  version: 1,
});

const persist = () => {
  const value = JSON.stringify(snapshot());
  persistPromise = persistPromise
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(STORAGE_KEY, value))
    .catch(() => undefined);
};

const pruneOldest = <T>(cache: Map<string, CacheEntry<T>>, limit: number) => {
  while (cache.size > limit) {
    let oldestKey: string | undefined;
    let oldestAt = Number.POSITIVE_INFINITY;
    cache.forEach((entry, key) => {
      if (entry.cachedAt < oldestAt) {
        oldestAt = entry.cachedAt;
        oldestKey = key;
      }
    });
    if (oldestKey === undefined) return;
    cache.delete(oldestKey);
  }
};

export const stickerPackPageKey = (
  type: string,
  page: number,
  pageSize: number,
) => `${type}:${page}:${pageSize}`;

export const isStickerCacheStale = <T>(
  entry: CacheEntry<T> | undefined,
  now = Date.now(),
) => !entry || now - entry.cachedAt >= STICKER_CACHE_TTL_MS;

export const hydrateStickerCache = () => {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const stored = parseSnapshot(raw);
      if (!stored) return;
      stored.pages.forEach(([key, entry]) => pages.set(key, entry));
      stored.details.forEach(([key, entry]) => details.set(key, entry));
      pruneOldest(pages, MAX_STICKER_PAGE_CACHE_ENTRIES);
      pruneOldest(details, MAX_STICKER_DETAIL_CACHE_ENTRIES);
    })
    .catch(() => undefined);
  return hydrationPromise;
};

export const getStickerPackPageCache = (key: string) => pages.get(key);

export const setStickerPackPageCache = (
  key: string,
  value: StickerPackPage,
  cachedAt = Date.now(),
) => {
  const entry = { cachedAt, value };
  pages.set(key, entry);
  pruneOldest(pages, MAX_STICKER_PAGE_CACHE_ENTRIES);
  persist();
  return entry;
};

export const getStickerPackDetailCache = (id: string) => details.get(id);

export const setStickerPackDetailCache = (
  id: string,
  value: StickerPackDetail,
  cachedAt = Date.now(),
) => {
  const entry = { cachedAt, value };
  details.set(id, entry);
  pruneOldest(details, MAX_STICKER_DETAIL_CACHE_ENTRIES);
  persist();
  return entry;
};

export const clearStickerCacheMemory = () => {
  pages.clear();
  details.clear();
  hydrationPromise = null;
};

export const clearStickerCache = async () => {
  clearStickerCacheMemory();
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
};
