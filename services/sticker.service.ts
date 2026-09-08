import { authenticatedFetch } from "@/services/authenticated-fetch";
import type { StickerPackDetail, StickerPackPage } from "@/types/sticker";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const readJson = async <T>(response: Response): Promise<T> => {
  const data = (await response.json()) as T | { detail?: string; title?: string };
  if (!response.ok) {
    const error = data as { detail?: string; title?: string };
    throw new Error(error.detail ?? error.title ?? "Không thể tải nhãn dán.");
  }
  return data as T;
};

export const getStickerPacks = async (
  type: "all" | "featured" | "free" | "paid" | "owned" | "usable" = "all",
  page = 1,
  pageSize = 50,
) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (type !== "all") params.set("type", type);
  return readJson<StickerPackPage>(await authenticatedFetch(`${BASE_URL}/api/sticker-packs?${params}`));
};

export const getStickerPack = async (id: string) =>
  readJson<StickerPackDetail>(await authenticatedFetch(`${BASE_URL}/api/sticker-packs/${id}`));
