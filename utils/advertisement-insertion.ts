export type InsertedItem<TContent, TAdvertisement> =
  | { kind: "content"; item: TContent }
  | { kind: "advertisement"; item: TAdvertisement };

export function insertAdvertisements<TContent, TAdvertisement>(
  content: readonly TContent[],
  advertisements: readonly TAdvertisement[],
  options: { minimumGap: number; maximumGap: number; seed: number },
): InsertedItem<TContent, TAdvertisement>[] {
  const minimumGap = Math.max(1, Math.floor(options.minimumGap));
  const maximumGap = Math.max(minimumGap, Math.floor(options.maximumGap));
  const gapRange = maximumGap - minimumGap + 1;
  const result: InsertedItem<TContent, TAdvertisement>[] = [];
  let organicSinceAd = 0;
  let adIndex = 0;
  let nextGap = minimumGap + (Math.abs(Math.floor(options.seed)) % gapRange);

  for (const item of content) {
    result.push({ kind: "content", item });
    organicSinceAd += 1;
    if (organicSinceAd < nextGap || adIndex >= advertisements.length) continue;

    result.push({ kind: "advertisement", item: advertisements[adIndex] });
    adIndex += 1;
    organicSinceAd = 0;
    nextGap = minimumGap + ((Math.abs(Math.floor(options.seed)) + adIndex) % gapRange);
  }

  return result;
}
