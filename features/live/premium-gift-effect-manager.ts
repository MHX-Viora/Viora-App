import type { LiveRealtimeGift } from "@/services/live-realtime.service";
import { addPremiumGiftEffect, advancePremiumGiftEffects, attachPremiumGiftBannerOrigin, initialPremiumGiftEffectState, nextPremiumGiftIndex, MAX_ACTIVE_PREMIUM_GIFTS, PREMIUM_GIFT_STAGGER_MS, type PremiumGiftEffectState } from "./premium-gift-effect-model.ts";
import type { GiftArtOrigin } from "./premium-gift-cinematic";

type Timer = ReturnType<typeof setTimeout>;
type EffectClock = { now: () => number; schedule: (callback: () => void, delay: number) => Timer; cancel: (timer: Timer) => void };
const systemClock: EffectClock = { now: Date.now, schedule: (callback, delay) => setTimeout(callback, delay), cancel: (timer) => clearTimeout(timer) };
const debug = (...args: unknown[]) => { if (typeof __DEV__ !== "undefined" && __DEV__) console.info("[GiftAnimation]", ...args); };

export function createPremiumGiftEffectManager(clock: EffectClock = systemClock) {
  let state: PremiumGiftEffectState = initialPremiumGiftEffectState;
  let timer: Timer | null = null;
  let concurrency = MAX_ACTIVE_PREMIUM_GIFTS;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  const scheduleNext = () => {
    if (timer !== null) clock.cancel(timer);
    timer = null;
    if (state.pausedAt !== null || state.activeEffects.some(e => !e.renderStarted) || !state.waiting.length || nextPremiumGiftIndex(state) < 0 || state.activeEffects.length >= concurrency) return;
    timer = clock.schedule(() => {
      timer = null; state = advancePremiumGiftEffects(state, clock.now(), concurrency); notify(); scheduleNext();
    }, Math.max(0, state.nextStartAt - clock.now()));
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    receive(gift: LiveRealtimeGift) {
      const next = addPremiumGiftEffect(state, gift, clock.now(), concurrency);
      if (next === state) return;
      state = next; debug({ eventId: gift.id, gift: gift.effectType, quantity: gift.quantity, expanded: gift.quantity, queued: state.waiting.length });
      notify(); scheduleNext();
    },
    markStarted(id: string) {
      const e = state.activeEffects.find(e => e.id === id);
      if (!e || e.renderStarted) return;
      const activeEffects = state.activeEffects.map(e => e.id === id ? { ...e, renderStarted: true, startedAt: clock.now(), endsAt: clock.now() + e.durationMs } : e);
      const totals = { ...state.totals };
      for (const eventId of e.comboEventIds ?? [e.eventId]) { const total = totals[eventId]; totals[eventId] = { ...total, started: total.started + (e.effectType === 2 ? total.quantity : 1) }; }
      state = { ...state, active: activeEffects[0], activeEffects, nextStartAt: clock.now() + PREMIUM_GIFT_STAGGER_MS[e.effectType], totals };
      debug("START", e.effectType, id); notify(); scheduleNext();
    },
    complete(id: string) {
      const e = state.activeEffects.find(e => e.id === id);
      if (!e?.renderStarted) return;
      const activeEffects = state.activeEffects.filter(e => e.id !== id), totals = { ...state.totals };
      for (const eventId of e.comboEventIds ?? [e.eventId]) { const total = totals[eventId]; totals[eventId] = { ...total, completed: total.completed + (e.effectType === 2 ? total.quantity : 1) }; }
      state = advancePremiumGiftEffects({ ...state, active: activeEffects[0] ?? null, activeEffects,
        totals,
      }, clock.now(), concurrency);
      debug("END", e.effectType, id); notify(); scheduleNext();
    },
    setBannerOrigin(giftId: string, origin: GiftArtOrigin) {
      const next = attachPremiumGiftBannerOrigin(state, giftId, origin);
      if (next !== state) { state = next; notify(); }
    },
    setConcurrency(limit: number) {
      const next = Math.max(1,Math.min(MAX_ACTIVE_PREMIUM_GIFTS,Math.floor(limit)));
      if (next === concurrency) return;
      concurrency = next; state = advancePremiumGiftEffects(state, clock.now(), concurrency); notify(); scheduleNext();
    },
    pause() { if (state.pausedAt !== null) return; state = { ...state, pausedAt: clock.now() }; scheduleNext(); notify(); },
    resume() {
      if (state.pausedAt === null) return;
      const elapsed = clock.now() - state.pausedAt, activeEffects = state.activeEffects.map(e => ({ ...e, startedAt: e.startedAt + elapsed, endsAt: e.endsAt + elapsed }));
      state = advancePremiumGiftEffects({ ...state, active: activeEffects[0] ?? null, activeEffects, pausedAt: null, nextStartAt: Math.max(clock.now(), state.nextStartAt + elapsed) }, clock.now(), concurrency);
      notify(); scheduleNext();
    },
    clear() { if (timer !== null) clock.cancel(timer); timer = null; state = initialPremiumGiftEffectState; notify(); },
  };
}
export type PremiumGiftEffectManager = ReturnType<typeof createPremiumGiftEffectManager>;
