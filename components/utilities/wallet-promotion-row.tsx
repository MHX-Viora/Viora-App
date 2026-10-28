import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ReactNode } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { WALLET_CARD_ASPECT_RATIO, WALLET_CARD_MAX_WIDTH } from "@/components/wallet/wallet-summary-card";
import { UtilityBannerCarousel } from './utility-banner-carousel';
import type { UtilityBanner } from '@/types/utility-banner';

const artwork = require("../../assets/images/utilities-mini-app.webp");

export function WalletPromotionRow({ children, onExplore, banners = [], active = true, onBannerOpen }: {
  children: ReactNode; onExplore?: () => void; banners?: UtilityBanner[]; active?: boolean; onBannerOpen?: (target: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const [focused, setFocused] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const slides = banners.filter(item => !failedImages.includes(item.imageUrl));
  const sideBySide = width >= 720;
  return (
    <View testID="wallet-promotion-row" onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      style={[styles.row, sideBySide && styles.rowWide]}>
      {children}
      {slides.length ? <View testID="utilities-promotion" style={[styles.banner, sideBySide ? styles.bannerWide : styles.bannerStacked]}>
        <UtilityBannerCarousel key={slides.map(item => item.id + item.imageUrl).join('|')} items={slides} active={active}
          onOpen={target => onBannerOpen?.(target)} onImageError={id => { const item = slides.find(slide => slide.id === id); if (item) setFailedImages(value => [...value, item.imageUrl]); }} />
      </View> : onExplore ? <Pressable testID="utilities-promotion" accessibilityRole="button" accessibilityLabel="Khám phá Mini App"
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onPress={onExplore} style={({ pressed, hovered }) => [
          styles.banner, sideBySide ? styles.bannerWide : styles.bannerStacked,
          pressed && styles.pressed, hovered && styles.hovered, focused && styles.focused,
        ]}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>ANKT MINI APP</Text>
          <Text accessibilityRole="header" style={styles.title}>Tiện ích trong tầm tay</Text>
          <Text style={styles.description}>Khám phá Mini App dành cho bạn.</Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Khám phá ngay</Text>
            <Ionicons name="arrow-forward" color="#1746A2" size={18} />
          </View>
        </View>
        <Image accessible={false} source={artwork} resizeMode="contain" style={styles.artwork} />
      </Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 16, width: "100%" },
  rowWide: { flexDirection: "row", alignItems: "stretch" },
  banner: { backgroundColor: "#EDF6FF", borderColor: "#CADCF3", borderWidth: 1, borderRadius: 18, overflow: "hidden", flexDirection: "row", alignItems: "center" },
  bannerWide: { flex: 1, minWidth: 0, height: WALLET_CARD_MAX_WIDTH / WALLET_CARD_ASPECT_RATIO },
  bannerStacked: { height: 192, width: "100%" },
  copy: { flex: 1, padding: 16, zIndex: 1 },
  eyebrow: { color: "#1746A2", fontSize: 10, lineHeight: 14, fontWeight: "700", letterSpacing: 1 },
  title: { color: "#102D60", fontSize: 20, lineHeight: 25, fontWeight: "700", marginTop: 6 },
  description: { color: "#3C5275", fontSize: 12, lineHeight: 18, marginTop: 6 },
  cta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, minHeight: 24 },
  ctaText: { color: "#1746A2", fontSize: 12, fontWeight: "700" },
  artwork: { width: "40%", height: "100%", alignSelf: "stretch" },
  pressed: { opacity: 0.82 },
  hovered: { borderColor: "#1746A2" },
  focused: { borderColor: "#1746A2", ...Platform.select({ web: { outlineColor: "#1746A2", outlineWidth: 2, outlineStyle: "solid", outlineOffset: 2 } }) },
});
