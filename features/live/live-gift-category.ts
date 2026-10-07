export type GiftCategory = "POPULAR" | "SPECIAL" | "OTHER";
type CategorizedGift = { category?: unknown; animationType: number };

export const giftCategories: { id: GiftCategory; label: string }[] = [
  { id: "POPULAR", label: "Phổ biến" },
  { id: "SPECIAL", label: "Đặc biệt" },
  { id: "OTHER", label: "Khác" },
];

export function giftCategory(gift: CategorizedGift): GiftCategory {
  if (gift.category !== undefined && gift.category !== null) {
    const value = typeof gift.category === "string" ? gift.category.trim().toUpperCase() : gift.category;
    if (value === "POPULAR" || value === 0) return "POPULAR";
    if (value === "SPECIAL" || value === 1) return "SPECIAL";
    return "OTHER";
  }
  return gift.animationType > 0 ? "SPECIAL" : "OTHER";
}

export function filterGiftCategory<T extends CategorizedGift>(gifts: readonly T[], category: GiftCategory): T[] {
  // The current BE DTO has no category: preserve its Popular tab as the full catalogue.
  return gifts.filter((gift) => category === "POPULAR" && gift.category == null || giftCategory(gift) === category);
}
