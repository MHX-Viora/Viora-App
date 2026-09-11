import type { Sticker } from "@/types/sticker";

export const RECENT_STICKER_LIMIT = 24;

export const promoteRecentSticker = (
  current: Sticker[],
  sticker: Sticker,
  limit = RECENT_STICKER_LIMIT,
) => [sticker, ...current.filter((item) => item.id !== sticker.id)].slice(0, limit);

export const parseRecentStickers = (value: string | null): Sticker[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Sticker =>
          typeof item === "object" && item !== null &&
          typeof item.id === "string" && typeof item.imageUrl === "string")
        .slice(0, RECENT_STICKER_LIMIT)
      : [];
  } catch {
    return [];
  }
};
