// Standalone development entry; never imported by the app or registered as a route.
import { registerRootComponent } from "expo";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CrownCinematicScene } from "../features/live/premium-gift-crown-scene";
import { CROWN_ANIMATION_DURATION } from "../features/live/premium-gift-crown-model";
import { cinematicQuality } from "../features/live/premium-gift-cinematic";
import { PremiumGiftEffectLayer } from "../features/live/premium-gift-effect-layer";
import { createPremiumGiftEffectManager } from "../features/live/premium-gift-effect-manager";
import type { PremiumGiftEffect } from "../features/live/premium-gift-effect-model";
import { ThemeProvider } from "../theme";

const effect: PremiumGiftEffect = { id: "preview", senderUserId: "preview", senderName: "Minh Anh", giftId: "crown", giftName: "Vương Miện", imageUrl: "", effectType: 3, effectTier: 3, quantity: 1, durationMs: CROWN_ANIMATION_DURATION, lastGiftAt: 0, endsAt: CROWN_ANIMATION_DURATION, revision: 1 };

function Preview() {
  const viewport = useWindowDimensions();
  const bounds = { width: viewport.width, height: viewport.height - 112, pageX: 0, pageY: 0 };
  const progress = useRef(new Animated.Value(0)).current;
  const manager = useRef(createPremiumGiftEffectManager()).current;
  const eventSequence = useRef(0);
  const queueState = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const [reduced, setReduced] = useState(false);
  const [queue, setQueue] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [clicks, setClicks] = useState(0);
  useEffect(() => () => { progress.stopAnimation(); manager.clear(); }, [manager, progress]);
  const play = () => { progress.stopAnimation(); progress.setValue(0); setMounted(true); setQueue(false); Animated.timing(progress, { toValue: 1, duration: CROWN_ANIMATION_DURATION, easing: Easing.linear, useNativeDriver: true, isInteraction: false }).start(); };
  const seek = (time: number) => { progress.stopAnimation(); setMounted(true); setQueue(false); progress.setValue(time / CROWN_ANIMATION_DURATION); };
  const send = (sender: string, type: 1 | 3 = 3) => manager.receive({ id: `${sender}-${++eventSequence.current}`, liveId: "preview", senderUserId: sender, senderName: sender, giftId: type === 3 ? "crown" : "firework", giftName: type === 3 ? "Vương Miện" : "Pháo Hoa", imageUrl: "", quantity: 1, totalAmount: 20, effectType: type, effectTier: 3, effectDurationMs: CROWN_ANIMATION_DURATION });
  const button = (label: string, onPress: () => void) => <Pressable accessibilityRole="button" key={label} onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  return <View style={{ flex: 1, backgroundColor: "#151515" }}>
    <View style={[styles.stage, { height: bounds.height }]}>
      <Image source={require("../assets/images/default-live-cover-neon.png")} style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%" }]} resizeMode="contain" />
      <Text style={styles.live}>LIVE · 1.248 người xem</Text>
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {mounted ? queue ? <PremiumGiftEffectLayer manager={manager} /> : <CrownCinematicScene bounds={bounds} effect={effect} progress={progress} quality={cinematicQuality(bounds, reduced, reduced)} reducedMotion={reduced} /> : null}
      </View>
      <View style={styles.comments}><Text style={styles.chat}>Linh: Vương miện đẹp quá!</Text><Text style={styles.chat}>Huy: Chúc mừng bạn</Text>{button(`Bình luận (${clicks})`, () => setClicks((value) => value + 1))}</View>
    </View>
    <View style={styles.controls}>
      <Text style={styles.buttonText}>Queue: {queueState.active?.senderName ?? "idle"} ×{queueState.active?.quantity ?? 0} | waiting {queueState.waiting.length}</Text>
      {button("Play", play)}{[0, 400, 700, 1400, 1800, 2500, 3200, 4000, 4400, 5100, 5600, 6100, 6500].map((time) => button(`${time}ms`, () => seek(time)))}
      {button("Reduced motion", () => { setReduced((value) => !value); seek(1800); })}
      {button("Queue 3", () => { manager.clear(); setQueue(true); setMounted(true); send("Minh Anh"); send("Linh", 1); send("Huy"); })}
      {button("Combo", () => { manager.clear(); setQueue(true); setMounted(true); [1, 2, 3].forEach(() => send("Minh Anh")); })}
      {button("Combo +1", () => { setQueue(true); setMounted(true); send("Minh Anh"); })}
      {button("Cancel", () => { progress.stopAnimation(); manager.clear(); setMounted(false); })}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  stage: { overflow: "hidden" }, live: { position: "absolute", top: 20, left: 16, color: "white", backgroundColor: "#A82441", padding: 8, borderRadius: 8, zIndex: 10 },
  comments: { position: "absolute", left: 16, bottom: 16, zIndex: 10 }, chat: { color: "white", fontSize: 14, marginBottom: 8, textShadowColor: "black", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  controls: { flexDirection: "row", flexWrap: "wrap", padding: 4, gap: 4 }, button: { backgroundColor: "#343434", padding: 8, borderRadius: 4 }, buttonText: { color: "white", fontSize: 12 },
});
registerRootComponent(function CrownPreviewRoot() { return <ThemeProvider><Preview /></ThemeProvider>; });
