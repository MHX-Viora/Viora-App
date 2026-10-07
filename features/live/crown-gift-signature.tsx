import { memo, useEffect, useId, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { UserAvatar } from "@/components/common/user-avatar";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { CROWN_ANIMATION_DURATION, crownLayout, ROYAL_GOLD } from "./premium-gift-crown-model";

type Props = Pick<SceneProps, "effect" | "progress" | "reducedMotion"> & { layout: ReturnType<typeof crownLayout>; width: number };
const glass = Platform.OS === "web" ? { backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as ViewStyle : null;

export const GiftSenderSignature = memo(function GiftSenderSignature({ effect, progress, reducedMotion, layout, width }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const combo = useRef(new Animated.Value(1)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  const lastQuantity = useRef(effect.quantity);
  useEffect(() => {
    if (lastQuantity.current === effect.quantity) return;
    lastQuantity.current = effect.quantity;
    if (reducedMotion) return;
    combo.setValue(1); sparkle.setValue(0);
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.timing(combo, { toValue: 1.25, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
        Animated.timing(combo, { toValue: 1, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }),
      ]),
      Animated.sequence([
        Animated.timing(sparkle, { toValue: 1, duration: 100, useNativeDriver: true, isInteraction: false }),
        Animated.timing(sparkle, { toValue: 0, duration: 230, useNativeDriver: true, isInteraction: false }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [combo, sparkle, effect.quantity, reducedMotion]);
  const frame = (times: number[], values: number[]) => progress.interpolate({ inputRange: times.map(time => time / CROWN_ANIMATION_DURATION), outputRange: values, extrapolate: "clamp" });
  const opacity = frame([0, 3200, 3600, 5600, 6200, 6500], [0, 0, 1, 1, 0, 0]);
  const translateY = frame([0, 3200, 3600, 5600, 6200, 6500], [12, 12, 0, 0, 10, 10]);
  const vipOpacity = frame([0, 3650, 3850, 5050, 5350, 6500], [0, 0, 1, 1, 0, 0]);
  const orbitOpacity = frame([0, 3300, 3600, 5400, 5700, 6500], [0, 0, .8, .8, 0, 0]);
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["-40deg", "280deg"] });
  const compact = layout.signatureHeight < 100;
  const signatureWidth = Math.min(width * .84, compact ? 350 : 320);
  const sender = Array.from(effect.senderName);
  const displayName = sender.length > 24 ? sender.slice(0, 23).join("") + "…" : effect.senderName;
  return <Animated.View accessible accessibilityLabel={`${effect.senderName} đã trao tặng Vương Miện ×${effect.quantity}`} pointerEvents="none" style={[styles.card, glass, { width: signatureWidth, left: layout.x - signatureWidth / 2, top: layout.senderY, opacity, minHeight: layout.signatureHeight, transform: reducedMotion ? [] : [{ translateY }] }]}>
    <View style={[styles.senderRow, compact && styles.compactRow]}>
      <View style={styles.avatarRing}>
        <UserAvatar displayName={effect.senderName} imageUrl={effect.senderAvatarUrl} size={compact ? 28 : 34} />
        {!reducedMotion ? <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: orbitOpacity, transform: [{ rotate }] }]}><Text style={styles.orbitStar}>✦</Text></Animated.View> : null}
      </View>
      <View style={styles.nameArea}>
        <Svg width="100%" height={compact ? 22 : 27} viewBox="0 0 230 28">
          <Defs><LinearGradient id={`sender-${id}`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={ROYAL_GOLD.gold} /><Stop offset=".5" stopColor={ROYAL_GOLD.highlight} /><Stop offset="1" stopColor={ROYAL_GOLD.champagne} /></LinearGradient></Defs>
          <SvgText x="115" y="21" textAnchor="middle" fontSize={18} fontWeight="700" fill={`url(#sender-${id})`}>{displayName}</SvgText>
        </Svg>
        <Animated.Text style={[styles.badge, { opacity: vipOpacity }]}>✦ ROYAL GIFT ✦</Animated.Text>
      </View>
    </View>
    <View style={[styles.titleRow, compact && styles.compactTitle]}>
      <RoyalOrnament /><Text style={styles.label}>{compact ? "VƯƠNG MIỆN" : "ĐÃ TRAO TẶNG"}</Text><RoyalOrnament reverse />
    </View>
    {!compact ? <Text style={styles.gift}>VƯƠNG MIỆN</Text> : null}
    <Animated.Text style={[styles.quantity, compact && styles.compactQuantity, { transform: [{ scale: combo }] }]}>×{effect.quantity}</Animated.Text>
    <Animated.Text style={[styles.comboStar, { opacity: sparkle, transform: [{ scale: combo }] }]}>✦</Animated.Text>
  </Animated.View>;
});

function RoyalOrnament({ reverse = false }: { reverse?: boolean }) {
  return <Svg width={36} height={10} viewBox="0 0 36 10" style={reverse ? { transform: [{ scaleX: -1 }] } : undefined}><Path d="M0 5H24M27 5L30 2L33 5L30 8Z" stroke={ROYAL_GOLD.gold} strokeOpacity=".6" strokeWidth=".8" fill="none" /></Svg>;
}
const styles = StyleSheet.create({
  card: { position: "absolute", alignItems: "center", borderRadius: 18, borderWidth: 1, borderColor: "rgba(244,201,93,.28)", backgroundColor: "rgba(15,10,5,.55)", paddingHorizontal: 14, paddingVertical: 8, zIndex: 8 },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 10, width: "100%" }, compactRow: { maxWidth: 265 },
  avatarRing: { padding: 3, borderRadius: 30, borderWidth: 1, borderColor: ROYAL_GOLD.gold },
  orbitStar: { position: "absolute", left: "50%", top: -5, color: ROYAL_GOLD.highlight, fontSize: 10 },
  nameArea: { flex: 1, minWidth: 0 }, badge: { color: ROYAL_GOLD.gold, fontSize: 8, letterSpacing: 2, textAlign: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }, compactTitle: { marginTop: 2 },
  label: { color: ROYAL_GOLD.champagne, fontSize: 8, letterSpacing: 2.2 },
  gift: { color: ROYAL_GOLD.highlight, fontSize: 13, lineHeight: 16, fontWeight: "700", letterSpacing: 3, marginTop: 2 },
  quantity: { color: ROYAL_GOLD.gold, fontSize: 16, lineHeight: 18, fontWeight: "700", marginTop: 1 },
  compactQuantity: { position: "absolute", right: 12, top: 23, fontSize: 16 },
  comboStar: { position: "absolute", right: 24, bottom: 12, color: ROYAL_GOLD.highlight, fontSize: 15 },
});
