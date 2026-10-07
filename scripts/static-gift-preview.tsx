// Isolated development preview; never imported by app routes.
import { registerRootComponent } from "expo";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../theme";
import { LiveGiftOverlay, useLiveGiftOverlay } from "../features/live/live-gift-overlay";

const gifts = [
  { name: "Hoa hồng", emoji: "🌹", type: 0, price: 1000 },
  { name: "Trái tim", emoji: "💖", type: 0, price: 5000 },
  { name: "Cà phê", emoji: "☕", type: 0, price: 10000 },
  { name: "Pháo hoa", emoji: "🎆", type: 1, price: 50000 },
  { name: "Tên lửa", emoji: "🚀", type: 2, price: 200000 },
  { name: "Vương miện", emoji: "👑", type: 3, price: 500000 },
];
function Preview() {
  const { giftQueue, showGiftEvent, clearGiftEvents } = useLiveGiftOverlay();
  const sequence = useRef(0);
  const { width } = useWindowDimensions();
  return <View style={styles.root}>
    <Text style={styles.title}>LIVE · Banner quà tĩnh</Text>
    <LiveGiftOverlay manager={giftQueue} compact={width < 600} />
    <View style={styles.controls}>
      {gifts.map((gift, index) => <Pressable key={gift.name} accessibilityRole="button" accessibilityLabel={`Gửi ${gift.name}`} style={styles.button} onPress={() => showGiftEvent({
        id: `preview-${++sequence.current}`, liveId: "preview", senderUserId: "ANKT", senderName: "ANKT",
        giftId: String(index), giftName: gift.name, quantity: 1, totalAmount: gift.price,
        imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text x="32" y="47" text-anchor="middle" font-size="42">${gift.emoji}</text></svg>`)}`,
        effectType: gift.type, effectTier: gift.type ? 3 : 1, effectDurationMs: 6000,
      })}><Text style={styles.text}>{gift.emoji} {gift.name}</Text></Pressable>)}
      <Pressable accessibilityRole="button" accessibilityLabel="Xóa banner" style={styles.button} onPress={clearGiftEvents}><Text style={styles.text}>Xóa banner</Text></Pressable>
    </View>
  </View>;
}
function App() { return <SafeAreaProvider><ThemeProvider><Preview /></ThemeProvider></SafeAreaProvider>; }
registerRootComponent(App);
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#15222F" }, title: { margin: 20, color: "#FFFFFF", fontSize: 18 }, controls: { position: "absolute", bottom: 20, left: 20, right: 20, flexDirection: "row", flexWrap: "wrap", gap: 8 }, button: { padding: 12, backgroundColor: "#283D50", borderRadius: 8 }, text: { color: "#FFFFFF" } });
