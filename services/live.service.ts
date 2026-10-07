import { Platform } from "react-native";

import { authenticatedFetch } from "@/services/authenticated-fetch";
import { parseLiveGiftCatalog } from "./live-gift-catalog.ts";
export type { LiveGift } from "./live-gift-catalog.ts";

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "";

export type LiveCategory = { id: string; name: string; slug: string; icon: string | null; sortOrder: number };
export type AgoraAccess = { appId: string; channelName: string; token: string; uid: number; role: "broadcaster" | "audience"; expiresAt: string };
export type LiveSession = {
  id: string; hostUserId: string; hostName: string; hostAvatarUrl: string | null;
  categoryId: string; categoryName: string; title: string; coverUrl: string | null;
  privacy: number; allowComments: boolean; allowGifts: boolean;
  status: number; startedAt: string | null; endedAt: string | null;
  currentViewerCount: number; peakViewerCount: number; totalViews: number; uniqueViewers: number;
};
export type CreateLiveInput = {
  title: string;
  categoryId: string;
  coverUrl: string | null;
  description: string | null;
  privacy: number;
  allowComments: boolean;
  allowGifts: boolean;
};

export class LiveApiError extends Error {
  constructor(message: string, public readonly code: string | undefined, public readonly status: number) { super(message); }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new LiveApiError(data?.message ?? data?.error?.message ?? "Không thể kết nối Live. Vui lòng thử lại.", data?.code ?? data?.error?.code, response.status);
  return data as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const getLiveCategories = () => request<LiveCategory[]>("/api/live-categories");
export const getLiveGifts = async () => {
  const response = await request<unknown>("/api/live-gifts");
  if (__DEV__) console.debug("[Gift] response:", response);
  const gifts = parseLiveGiftCatalog(response);
  if (__DEV__) console.debug("[Gift] mapped gifts:", gifts);
  return gifts;
};
export type LiveGiftIncome = { liveId: string; currency: "VND"; totalGiftCount: number; totalGiftValue: number; netAmount: number; senderCount: number };
export const getLiveGiftIncome = (liveId: string) => request<LiveGiftIncome>(`/api/lives/${liveId}/gifts/income`);
export const getLiveTopGifters = async (liveId: string) => {
  const gifters = await request<{ senderUserId: string; senderName: string; senderAvatarUrl: string | null; totalAmount: number; totalGiftCount: number }[]>(`/api/lives/${liveId}/gifts/top-gifters`);
  return gifters.map((item) => ({ userId: item.senderUserId, displayName: item.senderName, avatarUrl: item.senderAvatarUrl ?? undefined, totalAmount: item.totalAmount, totalGiftCount: item.totalGiftCount }));
};
export const sendLiveGift = (liveId: string, giftId: string, quantity: number, requestId: string, expectedUnitPrice: number) =>
  request<{ id: string; transactionId: string; totalAmount: number; hostEarning: number; senderBalance: number }>(`/api/lives/${liveId}/gifts`, {
    ...json({ giftId, quantity, requestId }),
    headers: { "Content-Type": "application/json", "X-Live-Gift-Currency": "VND", "X-Live-Gift-Expected-Price": String(expectedUnitPrice) },
  });
export const getLives = () => request<LiveSession[]>("/api/lives");
export const getLive = (id: string) => request<LiveSession>(`/api/lives/${id}`);
export const getActiveLive = () => request<LiveSession | null>("/api/lives/mine/active");
export const getAgoraConfig = () => request<{ appId: string }>("/api/lives/config");
export const createLive = (input: CreateLiveInput) => request<{ id: string; status: number }>("/api/lives", json(input));
export const getLiveToken = (id: string, renew = false) => request<AgoraAccess>(`/api/lives/${id}/token${renew ? "/renew" : ""}`, { method: "POST" });
export const startLive = (id: string) => request<{ id: string; startedAt: string }>(`/api/lives/${id}/start`, { method: "POST" });
export const endLive = (id: string) => request<{ id: string; endedAt: string }>(`/api/lives/${id}/end`, { method: "POST" });
export const heartbeatLive = (id: string) => request<void>(`/api/lives/${id}/heartbeat`, { method: "POST" });

export async function uploadLiveCover(uri: string): Promise<string> {
  const form = new FormData();
  const name = uri.split(/[?#]/)[0].split("/").pop() || "live-cover.jpg";
  const extension = name.split(".").pop()?.toLowerCase();
  const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Không thể đọc ảnh bìa đã chọn.");
    const blob = await response.blob();
    if (!blob.size || blob.size > 10_000_000 || !blob.type.startsWith("image/")) throw new Error("Ảnh bìa phải là ảnh dưới 10 MB.");
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as unknown as Blob);
  }
  const result = await request<{ url: string }>("/api/lives/cover", { method: "POST", body: form });
  return result.url;
}
