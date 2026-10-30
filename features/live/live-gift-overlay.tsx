import { memo, useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";

import type { LiveRealtimeGift } from "@/services/live-realtime.service";
import { GiftBanner } from "./live-gift-banner";
import { createLiveGiftQueueManager, type LiveGiftQueueManager } from "./live-gift-queue-manager";
import { SvgaGiftEffects } from './svga-gift-effects';

export function useLiveGiftOverlay() {
  const manager = useRef<LiveGiftQueueManager | null>(null);
  if (!manager.current) manager.current = createLiveGiftQueueManager();
  const giftQueue = manager.current;
  const showGiftEvent = useCallback((gift: LiveRealtimeGift) => {
    giftQueue.receive(gift);
  }, [giftQueue]);
  const clearGiftEvents = useCallback(() => {
    giftQueue.clear();
  }, [giftQueue]);
  useEffect(() => () => clearGiftEvents(), [clearGiftEvents]);
  return { giftQueue, showGiftEvent, clearGiftEvents };
}

export const LiveGiftOverlay = memo(function LiveGiftOverlay({ manager, compact = false }: {
  manager: LiveGiftQueueManager;
  compact?: boolean;
}) {
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const events = state.visible;
  return <><SvgaGiftEffects compact={compact} manager={manager} /><View accessibilityLiveRegion="polite" pointerEvents="none" style={[styles.overlay, compact && styles.compactOverlay]}>
    {events.map((event) => <GiftBanner compact={compact} event={event} key={event.id} />)}
  </View></>;
});

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    gap: 8,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 28,
    zIndex: 20,
  },
  compactOverlay: {
    bottom: 96,
  },
});
