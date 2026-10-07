// Standalone Metro development entry; never imported by app routes.
import { registerRootComponent } from "expo";
import * as Font from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { RocketCinematicScene } from "../features/live/premium-gift-rocket-scene";
import { cinematicQuality } from "../features/live/premium-gift-cinematic";
import { PremiumGiftEffectLayer } from "../features/live/premium-gift-effect-layer";
import { createPremiumGiftEffectManager } from "../features/live/premium-gift-effect-manager";
import { createLiveGiftQueueManager } from "../features/live/live-gift-queue-manager";
import { LiveGiftOverlay } from "../features/live/live-gift-overlay";
import type { PremiumGiftEffect } from "../features/live/premium-gift-effect-model";
import { setReducedGiftEffects } from "../features/live/premium-gift-effect-preference";
import { ThemeProvider } from "../theme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RocketHostPreview } from "./rocket-host-preview";
import { RocketOrbitalEnvironment as NativeJourney } from "../features/live/rocket-orbital-environment.tsx";

const effect: PremiumGiftEffect = { id: "rocket-preview", senderUserId: "preview", senderName: "Minh Anh", giftId: "rocket", giftName: "Tên lửa", imageUrl: "", effectType: 2, effectTier: 3, quantity: 1, durationMs: 8500, lastGiftAt: 0, endsAt: 8500, revision: 1 };

function RocketPreview() {
  const viewport = useWindowDimensions();
  const bounds = { width: viewport.width, height: Math.max(160, viewport.height - 132), pageX: 0, pageY: 0 };
  const progress = useRef(new Animated.Value(0)).current;
  const premium = useRef(createPremiumGiftEffectManager()).current;
  const banners = useRef(createLiveGiftQueueManager()).current;
  const sequence = useRef(0);
  const state = useSyncExternalStore(premium.subscribe, premium.getSnapshot, premium.getSnapshot);
  const [queue, setQueue] = useState(false); const [mounted, setMounted] = useState(true); const [reduced, setReduced] = useState(false);
  const [hostPreview,setHostPreview]=useState(false);
  const [nativePreview,setNativePreview]=useState(false);
  const [clicks, setClicks] = useState(0); const [draft, setDraft] = useState(""); const [cue, setCue] = useState("silent");
  useEffect(() => {
    setReducedGiftEffects(false);
    return () => { progress.stopAnimation(); premium.clear(); banners.clear(); setReducedGiftEffects(false); };
  }, [progress, premium, banners]);
  const cancel = () => { progress.stopAnimation(); premium.clear(); banners.clear(); setMounted(false); };
  const seek = (time: number) => { progress.stopAnimation(); premium.clear(); banners.clear(); setQueue(false); setMounted(true); progress.setValue(time / 8500); };
  const playFrom = (from = 0) => { seek(from); Animated.timing(progress, { toValue: 1, duration: 8500-from, easing: Easing.linear, useNativeDriver: true, isInteraction: false }).start(); };
  const play = () => playFrom();
  const send = (sender = "Minh Anh", type: 1 | 2 | 3 = 2, quantity = 1) => {
    const event = { id: `rocket-${++sequence.current}`, liveId: "preview", senderUserId: sender, senderName: sender,
      giftId: type === 2 ? "rocket" : type === 3 ? "crown" : "firework", giftName: type === 2 ? "Tên lửa" : type === 3 ? "Vương miện" : "Pháo hoa", imageUrl: "", quantity, totalAmount: 200 * quantity, effectType: type, effectTier: 3, effectDurationMs: 6000 };
    premium.receive(event); banners.receive(event); setQueue(true); setMounted(true);
  };
  const button = (label: string, action: () => void) => <Pressable accessibilityLabel={label} accessibilityRole="button" key={label} onPress={action} style={styles.button}><Text style={styles.text}>{label}</Text></Pressable>;
  return <View style={styles.root}>
    {hostPreview?<View style={[styles.stage,{height:bounds.height}]}><RocketHostPreview banners={banners} premium={premium} onControl={()=>setClicks(n=>n+1)} /></View>:<View style={[styles.stage, { height: bounds.height }]}>
      <Image source={require("../assets/images/default-live-cover-neon.png")} resizeMode="contain" style={StyleSheet.absoluteFillObject} />
      <Text style={styles.status}>LIVE · Rocket V7</Text>
      {mounted ? queue ? <><PremiumGiftEffectLayer manager={premium} onRocketSoundCue={setCue} /><LiveGiftOverlay compact={bounds.width < 600} manager={banners} /></> : <RocketCinematicScene bounds={bounds} effect={effect} progress={progress} quality={cinematicQuality(bounds, reduced, reduced)} reducedMotion={reduced} journeyRenderer={nativePreview?NativeJourney:undefined} /> : null}
      <View style={styles.comments}><Text style={styles.text}>Linh: Chúc mừng bạn!</Text><TextInput accessibilityLabel="Bình luận thử" placeholder="Nhập bình luận..." placeholderTextColor="#A9B7C7" onChangeText={setDraft} value={draft} style={styles.input} />{button(`Tương tác ${clicks}`, () => setClicks((value) => value + 1))}</View>
    </View>}
    <Text testID="premium-stats" style={styles.stats}>{JSON.stringify({active:state.activeEffects.map(e=>({id:e.id,eventId:e.eventId,index:e.instanceIndex,variant:e.variant,sender:e.senderName})),waiting:state.waiting.length,totals:Object.fromEntries(Object.entries(state.totals).map(([id,t])=>[id,{quantity:t.quantity,expanded:t.expanded,started:t.started,completed:t.completed}]))})}</Text>
    <ScrollView style={styles.controls} contentContainerStyle={styles.controlBody}>
      <Text style={styles.text}>Queue: {state.active?.senderName ?? "idle"} ×{state.active?.quantity ?? 0} · waiting {state.waiting.length} · cue: {cue} · controls {clicks}</Text>
      <View style={styles.buttons}>{button("Play", play)}{[300, 800, 1500, 1800, 2500, 3200, 4200, 5000, 5500, 6500, 7200, 7800, 8000, 8300, 8500].map((time) => button(`${time}ms`, () => seek(time)))}
        {button("Reduced motion", () => { setReduced((value) => !value); setReducedGiftEffects(!reduced); seek(1800); })}
        {button("Rocket queue", () => { cancel(); send(); })}{button("Combo +1", () => send())}
        {button("Queue 3", () => { cancel(); send("Minh Anh"); send("Linh", 3); send("Huy"); })}
        {button("Cancel", cancel)}
        {button("Host view",()=>{cancel();setHostPreview(true);send();})}
        {button("Viewer view",()=>{cancel();setHostPreview(false);send();})}
        {[1,3,5,10,20,50].map(n=>button(`Rocket x${n}`,()=>{cancel();send("A",2,n);}))}
        {[5,10].map(n=>button(`Fireworks x${n}`,()=>{cancel();send("B",1,n);}))}
        {[3,5].map(n=>button(`Crown x${n}`,()=>{cancel();send("C",3,n);}))}
        {button("Duplicate last",()=>{const last=Object.values(state.totals).at(-1)?.gift;if(last){premium.receive(last);banners.receive(last);}})}
        {button("Mixed quantity",()=>{cancel();send("A",2,3);send("B",1,5);send("C",3,2);})}
        {button("Native SVG",()=>{setNativePreview(v=>!v);seek(4500);})}
        {button("Space playback",()=>playFrom(5500))}
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  stats: {position:"absolute",opacity:0,pointerEvents:"none",width:1,height:1,overflow:"hidden"},
  root: { flex: 1, backgroundColor: "#091221" }, stage: { overflow: "hidden" },
  status: { color: "white", backgroundColor: "#B2254A", padding: 8, position: "absolute", top: 16, left: 16, zIndex: 30 },
  comments: { bottom: 12, left: 12, right: 12, position: "absolute", zIndex: 30, alignItems: "flex-start", gap: 4 },
  input: { backgroundColor: "rgba(10,20,35,.85)", borderRadius: 24, color: "white", paddingHorizontal: 16, height: 44, width: "70%" },
  controls: { height: 132, flexGrow: 0 }, controlBody: { padding: 6 }, buttons: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  button: { paddingHorizontal: 10, minHeight: 44, justifyContent: "center", borderRadius: 6, backgroundColor: "#253951" }, text: { color: "#FFFFFF", fontSize: 12 },
});
void Font.loadAsync(Ionicons.font).then(() => {
  registerRootComponent(function RocketPreviewRoot() { return <SafeAreaProvider><ThemeProvider><RocketPreview /></ThemeProvider></SafeAreaProvider>; });
});
