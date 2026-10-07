import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Animated, AppState, Easing, Platform, StyleSheet, View } from "react-native";

import { cinematicHapticCues, cinematicQuality, type CinematicBounds } from "./premium-gift-cinematic";
import { CrownCinematicScene } from "./premium-gift-crown-scene";
import { CinematicFireworkEffect } from "./premium-gift-firework-scene";
import { RocketCinematicScene } from "./premium-gift-rocket-scene";
import { PremiumGiftEffectBoundary } from "./premium-gift-effect-boundary";
import { useLiveReducedMotion } from "./use-live-reduced-motion";
import { useReducedGiftEffects } from "./premium-gift-effect-preference";
import type { PremiumGiftEffectManager } from "./premium-gift-effect-manager";
import { crownComboQuantity, premiumGiftRendererDescriptor, type PremiumGiftEffectType, type PremiumGiftInstance } from "./premium-gift-effect-model";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { PremiumGiftVirtualCamera } from "./premium-gift-virtual-camera";
import { useRocketSoundCues } from "./use-rocket-sound-cues";
import type { RocketSoundCue } from "./premium-gift-rocket-model";
import { useCrownSoundCues } from "./use-crown-sound-cues";
import type { CrownSoundCue } from "./crown-coronation-cues";

const LOW_POWER_DEVICE = (Device.deviceYearClass !== null && Device.deviceYearClass <= 2018) ||
  (Device.totalMemory !== null && Device.totalMemory < 3 * 1024 ** 3);

function renderPremiumScene(type: PremiumGiftEffectType, props: SceneProps) {
  switch (type) {
    case 1: return <CinematicFireworkEffect {...props} />;
    case 2: return <RocketCinematicScene {...props} />;
    case 3: return <CrownCinematicScene {...props} />;
  }
}

export const PremiumGiftEffectLayer = memo(function PremiumGiftEffectLayer({ manager, onRocketSoundCue, onCrownSoundCue }: {
  manager: PremiumGiftEffectManager; onRocketSoundCue?: (cue: RocketSoundCue) => void; onCrownSoundCue?: (cue: CrownSoundCue) => void;
}) {
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const reducedByUser = useReducedGiftEffects(), reducedBySystem = useLiveReducedMotion();
  const [bounds, setBounds] = useState<CinematicBounds>({ width: 0, height: 0, pageX: 0, pageY: 0 });
  const stageRef = useRef<View>(null);
  const baseQuality = cinematicQuality(bounds, reducedByUser, reducedBySystem, LOW_POWER_DEVICE);
  const count = state.activeEffects.length;
  const quality = count >= 3 ? "low" : count === 2 && baseQuality !== "low" ? "medium" : baseQuality;
  useEffect(() => {
    manager.setConcurrency(LOW_POWER_DEVICE || bounds.width < 600 || bounds.height < 400 ? 2 : 3);
  }, [manager,bounds.width,bounds.height]);
  useEffect(() => {
    const changed = (next: string) => next === "active" ? manager.resume() : manager.pause();
    if (AppState.currentState) changed(AppState.currentState);
    const subscription = AppState.addEventListener("change", changed);
    return () => { subscription.remove(); manager.pause(); };
  }, [manager]);
  return <View collapsable={false} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    setBounds(current => current.width === width && current.height === height ? current : { ...current, width, height });
    stageRef.current?.measureInWindow((pageX, pageY) => setBounds(current => current.pageX === pageX && current.pageY === pageY ? current : { ...current, pageX, pageY }));
  }} pointerEvents="none" ref={stageRef} style={styles.layer}>
    {bounds.width > 0 && bounds.height > 0 ? state.activeEffects.map(effect => <PremiumGiftAnimationInstance
      key={effect.id} effect={effect} manager={manager} bounds={bounds} quality={quality}
      reducedMotion={reducedByUser || reducedBySystem} intensity={[1, 1, .8, .65, .5][count]}
      crownQuantity={effect.effectType === 3 ? crownComboQuantity(state, effect.bannerEventId) : undefined}
      onRocketSoundCue={onRocketSoundCue} onCrownSoundCue={onCrownSoundCue} />) : null}
  </View>;
});

function PremiumGiftAnimationInstance({effect: active,manager,bounds,quality,reducedMotion,intensity,onRocketSoundCue,onCrownSoundCue,crownQuantity}: {
  effect: PremiumGiftInstance; manager: PremiumGiftEffectManager; bounds: CinematicBounds;
  quality: SceneProps["quality"]; reducedMotion: boolean; intensity: number; onRocketSoundCue?: (cue: RocketSoundCue) => void; onCrownSoundCue?: (cue: CrownSoundCue) => void; crownQuantity?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const activeId = active.id, effectType = active.effectType, durationMs = active.durationMs;
  const giftId = active.giftId, effectTier = active.effectTier;
  useRocketSoundCues(active, onRocketSoundCue, reducedMotion);
  useCrownSoundCues(active, reducedMotion, onCrownSoundCue);
  useEffect(() => {
    const managerState = manager.getSnapshot();
    const snapshot = managerState.activeEffects.find(e => e.id === activeId)!;
    let disposed = false, paused = false, value = snapshot.renderStarted ? Math.max(0,Math.min(1,((managerState.pausedAt ?? Date.now())-snapshot.startedAt)/durationMs)) : 0;
    let animation: Animated.CompositeAnimation | null = null;
    progress.setValue(value);
    manager.markStarted(activeId);
    const run = () => {
      if (disposed || paused) return;
      animation = Animated.timing(progress, { toValue: 1, duration: durationMs * (1 - value), easing: Easing.linear, useNativeDriver: true, isInteraction: false });
      animation.start(({ finished }) => { if (finished && !disposed && !paused) manager.complete(activeId); });
    };
    const changed = (next: string) => {
      if (next !== "active") { paused = true; progress.stopAnimation(current => { value = current; }); }
      else if (paused) { paused = false; run(); }
    };
    const subscription = AppState.addEventListener("change", changed);
    if (AppState.currentState && AppState.currentState !== "active") paused = true;
    else run();
    return () => { disposed = true; subscription.remove(); animation?.stop(); progress.stopAnimation(); };
  }, [activeId, durationMs, manager, progress]);
  useEffect(() => {
    if (!activeId || !effectType || !durationMs || reducedMotion || Platform.OS === "web") return;
    const feedback = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      soft: Haptics.ImpactFeedbackStyle.Soft,
    } as const;
    const timers = cinematicHapticCues(effectType, durationMs).map((cue) => setTimeout(() => {
      if (AppState.currentState && AppState.currentState !== "active") return;
      void Haptics.impactAsync(feedback[cue.intensity]).catch(() => undefined);
    }, cue.atMs));
    return () => timers.forEach(clearTimeout);
  }, [activeId, durationMs, effectType, reducedMotion]);

  useEffect(() => {
    if (!activeId || !effectType || !durationMs || !effectTier || typeof __DEV__ === "undefined" || !__DEV__) return;
    const descriptor = premiumGiftRendererDescriptor(effectType, effectTier);
    if (effectType === 1) {
      console.info("[PremiumGift:Firework]", {
        giftId: giftId,
        effectType: descriptor.gift,
        renderer: descriptor.renderer,
        effectVersion: descriptor.effectVersion,
        asset: descriptor.asset,
        quality,
        duration: durationMs,
      });
      return;
    }
    console.info("[PremiumGift]", {
      Gift: descriptor.gift,
      EffectType: descriptor.effectType,
      Tier: descriptor.tier,
      Renderer: descriptor.renderer,
      EffectVersion: descriptor.effectVersion,
      Asset: descriptor.asset,
    });
  }, [durationMs, effectTier, effectType, giftId, activeId, quality]);


  const sceneProps = { bounds, effect: crownQuantity === undefined ? active : { ...active, quantity: crownQuantity }, progress, quality, reducedMotion };
  return <View pointerEvents="none" testID={`premium-instance:${active.id}`} style={[StyleSheet.absoluteFillObject,{opacity:intensity}]}>
    <PremiumGiftEffectBoundary effect={active}>
      {effectType === 2 ? renderPremiumScene(effectType, sceneProps) : <PremiumGiftVirtualCamera bounds={bounds} effectType={effectType} progress={progress} quality={quality} reducedMotion={reducedMotion}>
        {renderPremiumScene(effectType, sceneProps)}
      </PremiumGiftVirtualCamera>}
    </PremiumGiftEffectBoundary>
  </View>;
}
const styles = StyleSheet.create({ layer: { ...StyleSheet.absoluteFillObject, overflow: "hidden", zIndex: 1 } });
