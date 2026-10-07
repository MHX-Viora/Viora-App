import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { UserAvatar } from "@/components/common/user-avatar";
import type { LiveGiftOverlayEvent } from "./live-gift-overlay-model";

export const GiftBanner = memo(function GiftBanner({ event, compact }: {
  event: LiveGiftOverlayEvent;
  compact: boolean;
}) {
  const gradientId = `gift-${event.id.replace(/[^a-zA-Z0-9]/g, "")}`;
  return <View accessibilityLabel={`${event.senderName} đã tặng ${event.giftName} ×${event.quantity}`} style={[styles.banner, compact && styles.compactBanner]}>
    <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFillObject} width="100%">
      <Defs><LinearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="30%">
        <Stop offset="0%" stopColor="#BD7528" stopOpacity={0.93} />
        <Stop offset="100%" stopColor="#B13543" stopOpacity={0.81} />
      </LinearGradient></Defs>
      <Rect fill={`url(#${gradientId})`} height="100%" rx="28" width="100%" />
    </Svg>
    <UserAvatar displayName={event.senderName} imageUrl={event.senderAvatarUrl} size={compact ? 34 : 39} style={styles.avatar} />
    <View style={styles.copy}>
      <Text numberOfLines={1} style={[styles.sender, compact && styles.compactSender]}>{event.senderName}</Text>
      <Text numberOfLines={1} style={[styles.detail, compact && styles.compactDetail]}>đã tặng {event.giftName}</Text>
    </View>
    <Image contentFit="contain" source={{ uri: event.imageUrl }} style={[styles.giftImage, compact && styles.compactGiftImage]} />
    <Text style={[styles.quantity, compact && styles.compactQuantity]}>×{event.quantity}</Text>
  </View>;
});

const styles = StyleSheet.create({
  banner: { alignItems: "center", alignSelf: "flex-end", borderRadius: 28, flexDirection: "row", maxWidth: "100%", minHeight: 54, paddingLeft: 5, paddingRight: 11, overflow: "hidden" },
  compactBanner: { minHeight: 48, paddingRight: 8 },
  avatar: { borderColor: "rgba(255,255,255,0.86)", borderWidth: 1.5 },
  copy: { flexShrink: 1, marginLeft: 8, maxWidth: 150, minWidth: 0 },
  sender: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  compactSender: { fontSize: 11 },
  detail: { color: "rgba(255,255,255,0.9)", fontSize: 10, marginTop: 2 },
  compactDetail: { fontSize: 9 },
  giftImage: { height: 60, marginHorizontal: -2, width: 60 },
  compactGiftImage: { height: 51, width: 51 },
  quantity: { color: "#FFFFFF", fontSize: 21, fontStyle: "italic", fontWeight: "900", marginLeft: -3 },
  compactQuantity: { fontSize: 18 },
});
