import { memo, useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";

import type { LiveRealtimeGift } from "@/services/live-realtime.service";
import { GiftBanner } from "./live-gift-banner";
import { createLiveGiftQueueManager, type LiveGiftQueueManager } from "./live-gift-queue-manager";

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
  if (!events.length) return null;

  return <View accessibilityLiveRegion="polite" pointerEvents="none" style={[styles.overlay, compact && styles.compactOverlay]}>
    {events.map((event) => <GiftBanner compact={compact} event={event} key={event.id} />)}
  </View>;
});

const styles = StyleSheet.create({
  overlay: {
    alignItems: "flex-end",
    gap: 8,
    maxWidth: 352,
    position: "absolute",
    right: 16,
    top: "40%",
    width: "72%",
    zIndex: 20,
  },
  compactOverlay: {
    maxWidth: 304,
    right: 10,
    top: "30%",
    width: "78%",
  },
});
