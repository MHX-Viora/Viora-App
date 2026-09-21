import { authenticatedFetch } from "@/services/authenticated-fetch";
import { mapFeedPost } from "@/services/feed.service";
import { mapReel } from "@/services/reel.service";
import type {
  Advertisement,
  AdvertisementFeedbackType,
  AdvertisementPage,
  AdvertisementPlacement,
  CreateAdvertisementInput,
} from "@/types/advertisement";
import type { ApiPost, FeedPost } from "@/types/feed";
import type { ApiReel, Reel } from "@/types/reel";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const JSON_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };

export class AdvertisementRequestError extends Error {
  code?: string;
  details?: { available?: number; required?: number; shortfall?: number };
}

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await authenticatedFetch(`${BASE_URL}${path}`, options);
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    const error = new AdvertisementRequestError(data?.error?.message || "Không thể xử lý quảng cáo.");
    error.code = data?.error?.code;
    error.details = data?.error?.details;
    throw error;
  }
  return data as T;
};

export const createAdvertisement = (input: CreateAdvertisementInput) =>
  request<Advertisement>("/api/advertisements", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(input) });

export const submitAdvertisement = (id: string) =>
  request<Advertisement>(`/api/advertisements/${encodeURIComponent(id)}/submit`, { method: "POST", headers: JSON_HEADERS });

export const pauseAdvertisement = (id: string) =>
  request<Advertisement>(`/api/advertisements/${encodeURIComponent(id)}/pause`, { method: "POST", headers: JSON_HEADERS });

export const resumeAdvertisement = (id: string) =>
  request<Advertisement>(`/api/advertisements/${encodeURIComponent(id)}/resume`, { method: "POST", headers: JSON_HEADERS });

export const cancelAdvertisement = (id: string) =>
  request<Advertisement>(`/api/advertisements/${encodeURIComponent(id)}/cancel`, { method: "POST", headers: JSON_HEADERS });

export const getAdvertisement = (id: string) =>
  request<Advertisement>(`/api/advertisements/${encodeURIComponent(id)}`);

export const getMyAdvertisements = (page = 1, pageSize = 20) =>
  request<AdvertisementPage>(`/api/advertisements/mine?page=${page}&pageSize=${pageSize}`);

export const getAdvertisementDelivery = (placement: AdvertisementPlacement, take = 3) =>
  request<{ items: Advertisement[] }>(`/api/advertisements/delivery?placement=${placement}&take=${take}`);

export const trackAdvertisementImpression = (id: string, clientEventId: string) =>
  request(`/api/advertisements/${encodeURIComponent(id)}/impressions`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ clientEventId }) });

export const trackAdvertisementClick = (id: string, clientEventId: string) =>
  request(`/api/advertisements/${encodeURIComponent(id)}/clicks`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ clientEventId }) });

export const sendAdvertisementFeedback = (id: string, type: AdvertisementFeedbackType, reason?: string) =>
  request(`/api/advertisements/${encodeURIComponent(id)}/feedback`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ type, reason }) });

export const advertisementToFeedPost = (advertisement: Advertisement): FeedPost => {
  const content = advertisement.content;
  const post = mapFeedPost({
    ...content,
    content: content.content ?? "",
    visibility: 0,
    isReacted: false,
    isSaved: false,
    reactionType: 0,
  } as ApiPost);
  return { ...post, advertisement: { id: advertisement.id, ctaType: advertisement.ctaType, destinationUrl: advertisement.destinationUrl } };
};

export const advertisementToReel = (advertisement: Advertisement): Reel => {
  const content = advertisement.content;
  const reel = mapReel({
    ...content,
    content: content.content ?? "",
    isSaved: false,
    isReacted: false,
    reactionType: 0,
    hashtags: [],
    user: { ...content.user, avatarUrl: content.user.avatarUrl ?? "", isFollowing: false },
  } as ApiReel);
  return { ...reel, advertisement: { id: advertisement.id, ctaType: advertisement.ctaType, destinationUrl: advertisement.destinationUrl } };
};

export const createAdvertisementEventId = (prefix: string, advertisementId: string) =>
  `${prefix}:${advertisementId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
