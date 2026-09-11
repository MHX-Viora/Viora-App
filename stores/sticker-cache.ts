import type { ChatLocalRepository } from "@/data/chat-local/chat-local-repository.types";
import type { StickerPackDetail, StickerPackPage } from "@/types/sticker";

export const STICKER_CACHE_TTL_MS = 60 * 60 * 1_000;
export const MAX_STICKER_PAGE_CACHE_ENTRIES = 12;
export const MAX_STICKER_DETAIL_CACHE_ENTRIES = 48;

type CacheEntry<T> = { cachedAt: number; value: T };
type StickerHydrationOptions = { detailIds?: string[]; pageKeys?: string[] };

const pages = new Map<string, CacheEntry<StickerPackPage>>();
const details = new Map<string, CacheEntry<StickerPackDetail>>();
const hydrationPromises = new Map<string, Promise<void>>();
let persistenceTail: Promise<unknown> = Promise.resolve();
let activeOwnerId: string | null = null;
let activeRepository: ChatLocalRepository | null = null;

const logFailure = (operation: string, error: unknown) => {
  if (__DEV__) console.info("[STICKER CACHE] local database fallback", {
    operation,
    message: error instanceof Error ? error.message : String(error),
  });
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

const hydrateResource = (key: string, read: () => Promise<void>) => {
  const existing = hydrationPromises.get(key);
  if (existing) return existing;
  const promise = read()
    .catch((error: unknown) => logFailure(`hydrate:${key}`, error))
    .finally(() => hydrationPromises.delete(key));
  hydrationPromises.set(key, promise);
  return promise;
};

export const stickerPackPageKey = (type: string, page: number, pageSize: number) =>
  `${type}:${page}:${pageSize}`;

export const isStickerCacheStale = <T>(
  entry: CacheEntry<T> | undefined,
  now = Date.now(),
) => !entry || now - entry.cachedAt >= STICKER_CACHE_TTL_MS;

export const hydrateStickerCache = async (
  repository?: ChatLocalRepository,
  ownerId?: string | null,
  options: StickerHydrationOptions = {},
) => {
  if (!repository || !ownerId) return;
  if (activeOwnerId !== ownerId) {
    pages.clear();
    details.clear();
    hydrationPromises.clear();
  }
  activeOwnerId = ownerId;
  activeRepository = repository;
  await repository.initialize();
  await Promise.all([
    ...(options.pageKeys ?? []).map((pageKey) => hydrateResource(`page:${pageKey}`, async () => {
      const stored = await repository.getStickerPage(ownerId, pageKey);
      if (stored) pages.set(pageKey, stored);
    })),
    ...(options.detailIds ?? []).map((detailId) => hydrateResource(`detail:${detailId}`, async () => {
      const stored = await repository.getStickerDetail(ownerId, detailId);
      if (stored) details.set(detailId, stored);
    })),
  ]);
  pruneOldest(pages, MAX_STICKER_PAGE_CACHE_ENTRIES);
  pruneOldest(details, MAX_STICKER_DETAIL_CACHE_ENTRIES);
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
  if (activeRepository && activeOwnerId) {
    const repository = activeRepository;
    const ownerId = activeOwnerId;
    persistenceTail = persistenceTail.catch(() => undefined)
      .then(() => repository.putStickerPage(ownerId, key, value, cachedAt));
    void persistenceTail
      .catch((error: unknown) => logFailure("persist-page", error));
  }
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
  if (activeRepository && activeOwnerId) {
    const repository = activeRepository;
    const ownerId = activeOwnerId;
    persistenceTail = persistenceTail.catch(() => undefined)
      .then(() => repository.putStickerDetail(ownerId, id, value, cachedAt));
    void persistenceTail
      .catch((error: unknown) => logFailure("persist-detail", error));
  }
  return entry;
};

export const clearStickerCacheMemory = () => {
  pages.clear();
  details.clear();
  hydrationPromises.clear();
  activeOwnerId = null;
  activeRepository = null;
};

export const clearStickerCache = async () => {
  clearStickerCacheMemory();
  await persistenceTail.catch(() => undefined);
};
