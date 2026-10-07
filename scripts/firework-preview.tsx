// Standalone Metro development entry; never imported by app routes.
import { registerRootComponent } from "expo";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { CinematicFireworkEffect } from "../features/live/premium-gift-firework-scene";
import { NativeFireworksRenderer } from "../features/live/fireworks-renderer-native";
import { cinematicQuality } from "../features/live/premium-gift-cinematic";
import { PremiumGiftEffectLayer } from "../features/live/premium-gift-effect-layer";
import { createPremiumGiftEffectManager } from "../features/live/premium-gift-effect-manager";
import { createLiveGiftQueueManager } from "../features/live/live-gift-queue-manager";
import { LiveGiftOverlay } from "../features/live/live-gift-overlay";
import type { PremiumGiftEffect } from "../features/live/premium-gift-effect-model";
import { setReducedGiftEffects } from "../features/live/premium-gift-effect-preference";
import { ThemeProvider } from "../theme";

const effect: PremiumGiftEffect = { id: "firework-preview", senderUserId: "preview", senderName: "Minh Anh", giftId: "firework", giftName: "Pháo hoa", imageUrl: "", effectType: 1, effectTier: 3, quantity: 1, durationMs: 4500, lastGiftAt: 0, endsAt: 4500, revision: 1 };

function FireworkPreview() {
  const viewport = useWindowDimensions();
  const bounds = { width: viewport.width, height: Math.max(160, viewport.height - 132), pageX: 0, pageY: 0 };
  const progress = useRef(new Animated.Value(0)).current;
  const premium = useRef(createPremiumGiftEffectManager()).current;
  const banners = useRef(createLiveGiftQueueManager()).current;
  const sequence = useRef(0);
  const state = useSyncExternalStore(premium.subscribe, premium.getSnapshot, premium.getSnapshot);
  const [queue, setQueue] = useState(false); const [mounted, setMounted] = useState(true); const [reduced, setReduced] = useState(false);
  const [nativePreview, setNativePreview] = useState(false);
  const [clicks, setClicks] = useState(0); const [draft, setDraft] = useState(""); const [cue] = useState("silent");
  useEffect(() => {
    setReducedGiftEffects(false);
    return () => { progress.stopAnimation(); premium.clear(); banners.clear(); setReducedGiftEffects(false); };
  }, [progress, premium, banners]);
  const cancel = () => { progress.stopAnimation(); premium.clear(); banners.clear(); setMounted(false); };
  const seek = (time: number) => { progress.stopAnimation(); premium.clear(); banners.clear(); setQueue(false); setMounted(true); progress.setValue(time / 4500); };
  const play = () => { seek(0); Animated.timing(progress, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true, isInteraction: false }).start(); };
  const send = (sender = "Minh Anh", type: 1 | 3 = 1) => {
    const event = { id: `firework-${++sequence.current}`, liveId: "preview", senderUserId: sender, senderName: sender,
      giftId: type === 3 ? "crown" : "firework", giftName: type === 3 ? "Vương miện" : "Pháo hoa", imageUrl: "", quantity: 1, totalAmount: 200, effectType: type, effectTier: 3, effectDurationMs: 4500 };
    premium.receive(event); banners.receive(event); setQueue(true); setMounted(true);
  };
  const button = (label: string, action: () => void) => <Pressable accessibilityLabel={label} accessibilityRole="button" key={label} onPress={action} style={styles.button}><Text style={styles.text}>{label}</Text></Pressable>;
  return <View style={styles.root}>
    <View style={[styles.stage, { height: bounds.height }]}>
      <Image source={require("../assets/images/default-live-cover-neon.png")} resizeMode="contain" style={StyleSheet.absoluteFillObject} />
      <Text style={styles.status}>LIVE · Fireworks V6</Text>
      {mounted ? queue ? <><PremiumGiftEffectLayer manager={premium} /><LiveGiftOverlay compact={bounds.width < 600} manager={banners} /></> : nativePreview ? <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><NativeFireworksRenderer bounds={bounds} effect={effect} progress={progress} quality={cinematicQuality(bounds, reduced, reduced)} reducedMotion={reduced} /></View> : <CinematicFireworkEffect bounds={bounds} effect={effect} progress={progress} quality={cinematicQuality(bounds, reduced, reduced)} reducedMotion={reduced} /> : null}
      <View style={styles.comments}><Text style={styles.text}>Linh: Chúc mừng bạn!</Text><TextInput accessibilityLabel="Bình luận thử" placeholder="Nhập bình luận..." placeholderTextColor="#A9B7C7" onChangeText={setDraft} value={draft} style={styles.input} />{button(`Tương tác ${clicks}`, () => setClicks((value) => value + 1))}</View>
    </View>
    <ScrollView style={styles.controls} contentContainerStyle={styles.controlBody}>
      <Text style={styles.text}>Queue: {state.active?.senderName ?? "idle"} ×{state.active?.quantity ?? 0} · waiting {state.waiting.length} · cue: {cue}</Text>
      <View style={styles.buttons}>{button("Play", play)}{[300, 800, 1250, 1800, 2600, 3100, 3500, 3800, 4200, 4500].map((time) => button(`${time}ms`, () => seek(time)))}
        {button("Reduced motion", () => { setReduced((value) => !value); setReducedGiftEffects(!reduced); seek(1800); })}
        {button("Firework queue", () => { cancel(); send(); })}{button("Combo +1", () => send())}
        {button("Queue 3", () => { cancel(); send("Minh Anh"); send("Linh", 3); send("Huy"); })}
        {button("Cancel", cancel)}
        {button("Native SVG", () => { setNativePreview(value => !value); seek(1800); })}
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#091221" }, stage: { overflow: "hidden" },
  status: { color: "white", backgroundColor: "#B2254A", padding: 8, position: "absolute", top: 16, left: 16, zIndex: 30 },
  comments: { bottom: 12, left: 12, right: 12, position: "absolute", zIndex: 30, alignItems: "flex-start", gap: 4 },
  input: { backgroundColor: "rgba(10,20,35,.85)", borderRadius: 24, color: "white", paddingHorizontal: 16, height: 44, width: "70%" },
  controls: { height: 132, flexGrow: 0 }, controlBody: { padding: 6 }, buttons: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  button: { paddingHorizontal: 10, minHeight: 44, justifyContent: "center", borderRadius: 6, backgroundColor: "#253951" }, text: { color: "#FFFFFF", fontSize: 12 },
});
registerRootComponent(function FireworkPreviewRoot() { return <ThemeProvider><FireworkPreview /></ThemeProvider>; });
