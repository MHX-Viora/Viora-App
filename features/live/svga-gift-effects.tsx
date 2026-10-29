import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LiveGiftQueueManager } from './live-gift-queue-manager';
import type { LiveGiftOverlayEvent } from './live-gift-overlay-model';
import { SvgaPlayer } from './svga-player';
import { useLiveReducedMotion } from './use-live-reduced-motion';
import { useReducedGiftEffects } from './premium-gift-effect-preference';

export function SvgaGiftEffects({ manager }: { manager: LiveGiftQueueManager }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const reducedBySystem = useLiveReducedMotion();
  const reducedByUser = useReducedGiftEffects();
  const reduced = reducedBySystem || reducedByUser;
  const seen = useRef(new Set<string>());
  const [queue, setQueue] = useState<LiveGiftOverlayEvent[]>([]);
  const active = queue[0];
  const complete = useCallback((id: string) => setQueue(items => items[0]?.id === id ? items.slice(1) : items), []);
  useEffect(() => {
    if (!state.seenIds.length) { seen.current.clear(); setQueue(items => items.length ? [] : items); return; }
    const added = state.visible.filter(event => event.animationUrl && event.animationDurationMs && !seen.current.has(event.id));
    for (const event of added) seen.current.add(event.id);
    if (seen.current.size > 300) seen.current = new Set(Array.from(seen.current).slice(-200));
    if (added.length) setQueue(items => [...items, ...added].slice(0, 12));
  }, [state.visible, state.seenIds]);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => complete(active.id), Math.min(30_000, active.animationDurationMs ?? 5000) + 2500);
    return () => clearTimeout(timer);
  }, [active, complete]);
  if (!active || reduced) return null;
  return <View accessibilityLabel={`Hiệu ứng quà ${active.giftName}`} pointerEvents="none" style={styles.layer}><SvgaPlayer key={active.id} url={active.animationUrl!} onFinished={() => complete(active.id)} style={StyleSheet.absoluteFillObject} /></View>;
}
const styles = StyleSheet.create({ layer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 18 } });
