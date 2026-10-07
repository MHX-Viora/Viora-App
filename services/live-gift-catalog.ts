export type LiveGift = { id: string; name: string; imageUrl: string; animationUrl: string | null; price: number; animationType: number; sortOrder: number; isActive: boolean; category?: string | number; effectType?: number; effectTier?: number; effectDurationMs?: number };

export const isValidGiftPrice = (price: unknown): price is number =>
  typeof price === "number" && Number.isSafeInteger(price) && price > 0;

const animationTypes: Record<string, number> = { small: 0, medium: 1, fullscreen: 2 };
const effectTypes: Record<string, number> = { none: 0, firework: 1, rocket: 2, crown: 3 };
function parseEnum(value: unknown, names: Record<string, number>): number | undefined {
  const parsed = typeof value === "string" ? names[value.trim().toLowerCase()] ?? (/^\d+$/.test(value) ? Number(value) : undefined) : value;
  return typeof parsed === "number" && Object.values(names).includes(parsed) ? parsed : undefined;
}

export function parseLiveGiftCatalog(payload: unknown): LiveGift[] {
  // The Active controller returns a bare array; unknown envelopes are contract failures.
  if (!Array.isArray(payload)) throw new Error("Invalid live gift catalog response: expected an array");
  let validEntries = 0;
  const mapped = payload.flatMap((item: unknown): LiveGift[] => {
    if (!item || typeof item !== "object") return [];
    const gift = item as Record<string, unknown>;
    const animationType = parseEnum(gift.animationType, animationTypes);
    if (typeof gift.id !== "string" || !gift.id || typeof gift.name !== "string" ||
        typeof gift.imageUrl !== "string" || animationType === undefined) return [];
    validEntries += 1;
    const isActive = typeof gift.isActive === "boolean" ? gift.isActive :
      typeof gift.status === "string" ? gift.status.trim().toLowerCase() === "active" : true;
    if (!isActive) return [];
    // Zero is an unavailable UI sentinel, never a stored or payable gift price.
    // A legacy priceCoin value cannot establish a real VND price.
    return [{ ...gift, animationType, isActive,
      ...(gift.effectType !== undefined ? { effectType: parseEnum(gift.effectType, effectTypes) ?? 0 } : {}),
      price: isValidGiftPrice(gift.price) ? gift.price : 0 } as LiveGift];
  });
  if (payload.length > 0 && validEntries === 0) throw new Error("Invalid live gift catalog entries");
  return mapped;
}
