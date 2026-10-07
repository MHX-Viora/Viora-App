import type { LiveRealtimeGift } from "@/services/live-realtime.service";

export const LIVE_GIFT_OVERLAY_LIMIT = 2;
export const LIVE_GIFT_COMBO_WINDOW_MS = 2_500;
export const LIVE_GIFT_OVERLAY_DURATION_MS = 3_800;
export const LIVE_GIFT_PREMIUM_DURATION_MS = 4_800;
const MAX_WAITING_GIFTS = 100;
const MAX_SEEN_IDS = 300;

export type LiveGiftTier = "standard" | "special" | "premium";
export type LiveGiftOverlayEvent = {
  id: string;
  senderUserId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  giftId: string;
  giftName: string;
  imageUrl: string;
  quantity: number;
  tier: LiveGiftTier;
  lastGiftAt: number;
  expiresAt: number;
  revision: number;
  effectType?: number;
  effectTier?: number;
};
export type LiveGiftOverlayState = {
  visible: readonly LiveGiftOverlayEvent[];
  waiting: readonly LiveGiftOverlayEvent[];
  seenIds: readonly string[];
};

export const initialLiveGiftOverlayState: LiveGiftOverlayState = {
  visible: [], waiting: [], seenIds: [],
};

export const liveGiftDuration = (tier: LiveGiftTier) =>
  tier === "premium" ? LIVE_GIFT_PREMIUM_DURATION_MS : LIVE_GIFT_OVERLAY_DURATION_MS;

const giftTier = (gift: LiveRealtimeGift): LiveGiftTier => {
  if (gift.effectTier === 3) return "premium";
  if (gift.effectTier === 2) return "special";
  const unitPrice = gift.totalAmount / gift.quantity;
  return unitPrice >= 100_000 ? "premium" : unitPrice >= 20_000 ? "special" : "standard";
};

export const expireLiveGiftOverlayEvents = (
  state: LiveGiftOverlayState,
  now = Date.now(),
): LiveGiftOverlayState => {
  const remaining = state.visible.filter((event) => event.expiresAt > now);
  if (remaining.length === state.visible.length) return state;
  const waiting = [...state.waiting];
  while (remaining.length < LIVE_GIFT_OVERLAY_LIMIT && waiting.length) {
    const next = waiting.shift()!;
    remaining.push({ ...next, expiresAt: now + liveGiftDuration(next.tier) });
  }
  return { ...state, visible: remaining, waiting };
};

export const addLiveGiftOverlayEvent = (
  current: LiveGiftOverlayState,
  gift: LiveRealtimeGift,
  receivedAt = Date.now(),
): LiveGiftOverlayState => {
  if (!gift.id || !gift.senderUserId || !gift.giftId ||
      !Number.isFinite(gift.quantity) || gift.quantity < 1 ||
      !Number.isFinite(gift.totalAmount) || gift.totalAmount < 0 ||
      current.seenIds.includes(gift.id)) return current;

  const state = expireLiveGiftOverlayEvents(current, receivedAt);
  const seenIds = [...state.seenIds, gift.id].slice(-MAX_SEEN_IDS);
  for (const bucket of ["visible", "waiting"] as const) {
    const index = state[bucket].findLastIndex((event) =>
      event.senderUserId === gift.senderUserId && event.giftId === gift.giftId &&
      receivedAt >= event.lastGiftAt && receivedAt - event.lastGiftAt <= LIVE_GIFT_COMBO_WINDOW_MS);
    if (index < 0) continue;
    const events = [...state[bucket]];
    const previous = events[index];
    events[index] = {
      ...previous,
      quantity: previous.quantity + gift.quantity,
      lastGiftAt: receivedAt,
      expiresAt: bucket === "visible" ? receivedAt + liveGiftDuration(previous.tier) : 0,
      revision: previous.revision + 1,
    };
    return { ...state, [bucket]: events, seenIds };
  }

  const tier = giftTier(gift);
  const event: LiveGiftOverlayEvent = {
    id: gift.id,
    senderUserId: gift.senderUserId,
    senderName: gift.senderName,
    senderAvatarUrl: gift.senderAvatarUrl,
    giftId: gift.giftId,
    giftName: gift.giftName,
    imageUrl: gift.imageUrl,
    quantity: gift.quantity,
    tier,
    lastGiftAt: receivedAt,
    expiresAt: 0,
    revision: 1,
    effectType: gift.effectType,
    effectTier: gift.effectTier,
  };
  if (state.visible.length < LIVE_GIFT_OVERLAY_LIMIT) {
    return { ...state, visible: [...state.visible, { ...event, expiresAt: receivedAt + liveGiftDuration(tier) }], seenIds };
  }
  return { ...state, waiting: [...state.waiting, event].slice(-MAX_WAITING_GIFTS), seenIds };
};
