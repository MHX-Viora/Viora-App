import type { LiveRealtimeGift } from "@/services/live-realtime.service";
import type { GiftArtOrigin } from "./premium-gift-cinematic";
import { CROWN_ANIMATION_DURATION } from "./premium-gift-crown-model.ts";
import { ROCKET_ORBITAL_DURATION } from "./rocket-orbital-model.ts";

export const MAX_ACTIVE_PREMIUM_GIFTS = 3;
export const PREMIUM_GIFT_STAGGER_MS = { 1: 180, 2: 300, 3: 500 } as const;

export type PremiumGiftEffectType = 1 | 2 | 3;
export type PremiumGiftRendererDescriptor = {
  gift: "FIREWORK" | "ROCKET" | "CROWN";
  effectType: PremiumGiftEffectType;
  tier: number;
  renderer: "CinematicFireworkEffect" | "RocketCinematicScene" | "CrownCinematicScene";
  effectVersion: "V3" | "V4" | "V5" | "V6" | "V7";
  asset: "procedural-particles:firework-v5" | "procedural-particles:firework-v6" | "procedural-svg:rocket-v4" | "procedural-metal:crown-coronation-v5" | "procedural-particles:rocket-v6" | "procedural-orbital:rocket-v7";
};

export function premiumGiftRendererDescriptor(type: PremiumGiftEffectType, tier: number): PremiumGiftRendererDescriptor {
  switch (type) {
    case 1: return { gift: "FIREWORK", effectType: type, tier, renderer: "CinematicFireworkEffect", effectVersion: "V6", asset: "procedural-particles:firework-v6" };
    case 2: return { gift: "ROCKET", effectType: type, tier, renderer: "RocketCinematicScene", effectVersion: "V7", asset: "procedural-orbital:rocket-v7" };
    case 3: return { gift: "CROWN", effectType: type, tier, renderer: "CrownCinematicScene", effectVersion: "V5", asset: "procedural-metal:crown-coronation-v5" };
  }
}

export type PremiumGiftEffect = {
  id: string;
  senderUserId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  giftId: string;
  giftName: string;
  imageUrl: string;
  effectType: PremiumGiftEffectType;
  effectTier: number;
  durationMs: number;
  quantity: number;
  lastGiftAt: number;
  endsAt: number;
  revision: number;
  bannerOrigin?: GiftArtOrigin;
  instanceIndex?: number;
  variant?: number;
  eventId?: string;
  totalQuantity?: number;
  comboEventIds?: readonly string[];
};

export type PremiumGiftInstance = PremiumGiftEffect & {
  eventId: string; instanceIndex: number; totalQuantity: number; bannerEventId: string;
  startedAt: number; renderStarted: boolean;
};
export type PremiumGiftTotal = { quantity: number; expanded: number; started: number; completed: number; gift: LiveRealtimeGift; bannerEventId: string };
export type PremiumGiftEffectState = {
  active: PremiumGiftInstance | null;
  activeEffects: readonly PremiumGiftInstance[];
  waiting: readonly PremiumGiftInstance[];
  seenIds: readonly string[];
  totals: Readonly<Record<string, PremiumGiftTotal>>;
  nextStartAt: number;
  pausedAt: number | null;
};
export const initialPremiumGiftEffectState: PremiumGiftEffectState = {
  active: null, activeEffects: [], waiting: [], seenIds: [], totals: {}, nextStartAt: 0, pausedAt: null,
};

export function expandPremiumGift(gift: LiveRealtimeGift, now: number, bannerEventId = gift.id): PremiumGiftInstance[] {
  const type = gift.effectType;
  if (!gift.id || !gift.senderUserId || !gift.giftId ||
      (type !== 1 && type !== 2 && type !== 3) ||
      !Number.isInteger(gift.effectTier) || gift.effectTier! < 1 || gift.effectTier! > 3 ||
      !Number.isInteger(gift.effectDurationMs) || gift.effectDurationMs! < 3000 || gift.effectDurationMs! > 7000 ||
      !Number.isSafeInteger(gift.quantity) || gift.quantity < 1) return [];
  const durationMs = type === 1 ? 4500 : type === 3 ? CROWN_ANIMATION_DURATION : ROCKET_ORBITAL_DURATION;
  return Array.from({ length: type === 2 ? 1 : gift.quantity }, (_, instanceIndex) => ({
    id: `${gift.id}-${instanceIndex}`, eventId: gift.id, instanceIndex, totalQuantity: gift.quantity, bannerEventId,
    senderUserId: gift.senderUserId, senderName: gift.senderName, senderAvatarUrl: gift.senderAvatarUrl,
    giftId: gift.giftId, giftName: gift.giftName, imageUrl: gift.imageUrl, effectType: type, effectTier: gift.effectTier!,
    durationMs, quantity: type === 2 ? gift.quantity : 1, comboEventIds: type === 2 ? [gift.id] : undefined, lastGiftAt: now, endsAt: 0, startedAt: 0, renderStarted: false, revision: 1,
  }));
}

// Orbital flights occupy the whole cinematic stage; crowns retain one hero slot.
export function nextPremiumGiftIndex(state: PremiumGiftEffectState) {
  if (state.activeEffects.some(effect => effect.effectType === 2)) return -1;
  const crownActive = state.activeEffects.some(effect => effect.effectType === 3);
  return state.waiting.findIndex(effect => effect.effectType === 2 ? state.activeEffects.length === 0 : effect.effectType !== 3 || !crownActive);
}

export function crownComboQuantity(state: PremiumGiftEffectState, bannerEventId: string) {
  return Object.values(state.totals).reduce((total, item) => total +
    (item.gift.effectType === 3 && item.bannerEventId === bannerEventId ? item.quantity : 0), 0);
}

export function advancePremiumGiftEffects(state: PremiumGiftEffectState, now: number, limit = MAX_ACTIVE_PREMIUM_GIFTS): PremiumGiftEffectState {
  if (state.pausedAt !== null || state.activeEffects.some(e => !e.renderStarted) || !state.waiting.length || state.activeEffects.length >= limit || now < state.nextStartAt) return state;
  const index = nextPremiumGiftIndex(state);
  if (index < 0) return state;
  const next = state.waiting[index];
  const waiting = state.waiting.filter((_, i) => i !== index);
  const instance = { ...next, startedAt: now, endsAt: now + next.durationMs };
  const activeEffects = [...state.activeEffects, instance];
  return { ...state, active: activeEffects[0], activeEffects, waiting, nextStartAt: now + PREMIUM_GIFT_STAGGER_MS[next.effectType] };
}

export function addPremiumGiftEffect(state: PremiumGiftEffectState, gift: LiveRealtimeGift, now: number, limit = MAX_ACTIVE_PREMIUM_GIFTS): PremiumGiftEffectState {
  if (state.seenIds.includes(gift.id)) return state;
  const activeRocket = gift.effectType === 2 ? state.activeEffects.find(e => e.effectType === 2 && e.senderUserId === gift.senderUserId && e.giftId === gift.giftId) : undefined;
  const recent = activeRocket ?? [...state.activeEffects, ...state.waiting].findLast(e => e.senderUserId === gift.senderUserId && e.giftId === gift.giftId && e.effectType === gift.effectType && now >= e.lastGiftAt && now - e.lastGiftAt <= 2500);
  const bannerEventId = recent?.bannerEventId ?? gift.id;
  const ordinal = state.activeEffects.length + state.waiting.length + Object.values(state.totals).reduce((n, t) => n + t.completed, 0);
  const instances = expandPremiumGift(gift, now, bannerEventId).map((e, i) => ({ ...e, variant: ordinal + i }));
  if (!instances.length) return state;
  const total = { quantity: gift.quantity, expanded: gift.quantity, started: 0, completed: 0, gift: { ...gift }, bannerEventId };
  if (gift.effectType === 2 && recent) {
    const merge = (e: PremiumGiftInstance) => e.id === recent.id ? { ...e, quantity: e.quantity + gift.quantity, lastGiftAt: now, comboEventIds: [...(e.comboEventIds ?? [e.eventId]), gift.id] } : e;
    const activeEffects = state.activeEffects.map(merge), waiting = state.waiting.map(merge);
    if (recent.renderStarted) total.started = gift.quantity;
    return { ...state, active: activeEffects[0] ?? null, activeEffects, waiting, seenIds: [...state.seenIds, gift.id], totals: { ...state.totals, [gift.id]: total } };
  }
  return advancePremiumGiftEffects({ ...state, waiting: [...state.waiting, ...instances], seenIds: [...state.seenIds, gift.id],
    totals: { ...state.totals, [gift.id]: total },
  }, now, limit);
}

export function attachPremiumGiftBannerOrigin(state: PremiumGiftEffectState, giftId: string, origin: GiftArtOrigin): PremiumGiftEffectState {
  let changed = false;
  const attach = (e: PremiumGiftInstance) => {
    if ((e.bannerEventId !== giftId && e.id !== giftId) || e.bannerOrigin) return e;
    changed = true; return { ...e, bannerOrigin: { ...origin } };
  };
  const activeEffects = state.activeEffects.map(attach), waiting = state.waiting.map(attach);
  return changed ? { ...state, active: activeEffects[0] ?? null, activeEffects, waiting } : state;
}
