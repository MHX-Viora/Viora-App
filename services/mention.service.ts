import { authenticatedFetch } from "@/services/authenticated-fetch";
import type { MentionUser } from "@/types/mention";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export const searchMentionUsers = async (
  keyword: string,
): Promise<MentionUser[]> => {
  const value = keyword.trim();
  if (!value) return [];
  const response = await authenticatedFetch(
    `${BASE_URL}/api/users/search-mention?keyword=${encodeURIComponent(value)}`,
  );
  if (!response.ok) throw new Error("Không thể tìm người dùng.");
  return (await response.json()) as MentionUser[];
};
