import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LegalDocument } from "@/types/legal";
import { LegalDocumentType } from "@/types/legal";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const CACHE_PREFIX = "legal-document:";

export async function getLegalDocument(type: LegalDocumentType): Promise<LegalDocument> {
  const key = `${CACHE_PREFIX}${type}`;
  try {
    const response = await fetch(`${BASE_URL}/api/legal/${type}`, { headers: { Accept: "application/json" } });
    if (response.status === 404) throw new Error("Chưa có tài liệu được công bố.");
    if (!response.ok) throw new Error("Không thể tải tài liệu. Vui lòng thử lại.");
    const document = await response.json() as LegalDocument;
    await AsyncStorage.setItem(key, JSON.stringify(document));
    return document;
  } catch (error) {
    const cached = await AsyncStorage.getItem(key);
    if (cached) return JSON.parse(cached) as LegalDocument;
    throw error;
  }
}
