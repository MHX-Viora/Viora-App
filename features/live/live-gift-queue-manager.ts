import type { LiveRealtimeGift } from "@/services/live-realtime.service";
import {
  addLiveGiftOverlayEvent,
  expireLiveGiftOverlayEvents,
  initialLiveGiftOverlayState,
  type LiveGiftOverlayState,
} from "./live-gift-overlay-model.ts";

type TimerHandle = ReturnType<typeof setTimeout>;
type GiftClock = {
  now: () => number;
  schedule: (callback: () => void, delay: number) => TimerHandle;
  cancel: (handle: TimerHandle) => void;
};

const browserClock: GiftClock = {
  now: Date.now,
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: (timer) => clearTimeout(timer),
};

export function createLiveGiftQueueManager(clock: GiftClock = browserClock) {
  let state: LiveGiftOverlayState = initialLiveGiftOverlayState;
  let timer: TimerHandle | null = null;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());
  const scheduleNext = () => {
    if (timer !== null) clock.cancel(timer);
    timer = null;
    if (!state.visible.length) return;
    const nextExpiry = Math.min(...state.visible.map((event) => event.expiresAt));
    timer = clock.schedule(() => {
      timer = null;
      const next = expireLiveGiftOverlayEvents(state, clock.now());
      if (next !== state) { state = next; notify(); }
      scheduleNext();
    }, Math.max(0, nextExpiry - clock.now()));
  };

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    receive(gift: LiveRealtimeGift) {
      const next = addLiveGiftOverlayEvent(state, gift, clock.now());
      if (next === state) return;
      state = next;
      notify();
      scheduleNext();
    },
    clear() {
      if (timer !== null) clock.cancel(timer);
      timer = null;
      state = initialLiveGiftOverlayState;
      notify();
    },
  };
}

export type LiveGiftQueueManager = ReturnType<typeof createLiveGiftQueueManager>;
