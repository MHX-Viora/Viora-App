export type InsertedItem<TContent, TAdvertisement> =
  | { kind: "content"; item: TContent }
  | { kind: "advertisement"; item: TAdvertisement };

export const AD_PLACEMENT_GAPS = {
  feed: { minimumGap: 4, maximumGap: 6, firstGap: 2, seed: 1 },
  news: { minimumGap: 4, maximumGap: 6, seed: 0 },
  reels: { minimumGap: 5, maximumGap: 8, seed: 1 },
} as const;

export const shouldLoadFeedAdvertisements = (category: "articles" | "community") =>
  category === "community";

export function insertAdvertisements<TContent, TAdvertisement>(
  content: readonly TContent[],
  advertisements: readonly TAdvertisement[],
  options: { minimumGap: number; maximumGap: number; firstGap?: number; seed: number },
): InsertedItem<TContent, TAdvertisement>[] {
  const minimumGap = Math.max(1, Math.floor(options.minimumGap));
  const maximumGap = Math.max(minimumGap, Math.floor(options.maximumGap));
  const gapRange = maximumGap - minimumGap + 1;
  const result: InsertedItem<TContent, TAdvertisement>[] = [];
  let organicSinceAd = 0;
  let adIndex = 0;
  let nextGap = options.firstGap === undefined
    ? minimumGap + (Math.abs(Math.floor(options.seed)) % gapRange)
    : Math.max(1, Math.floor(options.firstGap));

  for (const item of content) {
    result.push({ kind: "content", item });
    organicSinceAd += 1;
    if (organicSinceAd < nextGap || adIndex >= advertisements.length) continue;

    result.push({ kind: "advertisement", item: advertisements[adIndex] });
    adIndex += 1;
    organicSinceAd = 0;
    nextGap = minimumGap + ((Math.abs(Math.floor(options.seed)) + adIndex) % gapRange);
  }

  if (adIndex === 0 && content.length >= 2 && advertisements.length > 0) {
    result.push({ kind: "advertisement", item: advertisements[0] });
  }

  return result;
}

export function mergeReelAdvertisements<T extends { id: string; advertisement?: unknown }>(
  content: readonly T[],
  delivery: readonly { postId: string; item: T }[],
  previews: readonly { postId: string; item: T }[],
  options: { minimumGap: number; maximumGap: number; firstGap?: number; seed: number },
): T[] {
  const previewByPostId = new Map(previews.map((preview) => [preview.postId, preview.item]));
  const deliveredPostIds = new Set(delivery.map((advertisement) => advertisement.postId));
  const organicPostIds = new Set(content.map((item) => item.id));
  const organic = content
    .filter((item) => !deliveredPostIds.has(item.id))
    .map((item) => {
      const preview = previewByPostId.get(item.id);
      return preview?.advertisement ? { ...item, advertisement: preview.advertisement } : item;
    });
  const result = insertAdvertisements(organic, delivery.map((advertisement) => advertisement.item), options)
    .map((entry) => entry.item);
  const missingPreview = previews.find((preview) => !organicPostIds.has(preview.postId));
  if (missingPreview) result.splice(Math.min(2, result.length), 0, missingPreview.item);
  return result;
}
