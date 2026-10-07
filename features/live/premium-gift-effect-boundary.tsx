import { Component, type ErrorInfo, type ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import type { PremiumGiftEffect } from "./premium-gift-effect-model";

type Props = { children: ReactNode; effect: PremiumGiftEffect };
type State = { failed: boolean };

export class PremiumGiftEffectBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[PremiumGift] Cinematic renderer failed; safe fallback active", {
        effectId: this.props.effect.id,
        effectType: this.props.effect.effectType,
        error: error.message,
        componentStack: info.componentStack,
      });
    }
  }

  render() {
    return this.state.failed
      ? <SafePremiumGiftFallback effect={this.props.effect} />
      : this.props.children;
  }
}

function SafePremiumGiftFallback({ effect }: { effect: PremiumGiftEffect }) {
  return <View pointerEvents="none" style={styles.fallback}>
    <View style={styles.halo} />
    <Image resizeMode="contain" source={{ uri: effect.imageUrl }} style={styles.image} />
    <Text numberOfLines={1} style={styles.sender}>{effect.senderName.toLocaleUpperCase()}</Text>
    <Text style={styles.detail}>{effect.giftName} · x{effect.quantity}</Text>
  </View>;
}

const styles = StyleSheet.create({
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 2 },
  halo: { backgroundColor: "rgba(224,183,94,0.14)", borderRadius: 130, height: 260, position: "absolute", width: 260 },
  image: { height: 112, width: 112 },
  sender: { color: "#FFF8E8", fontSize: 18, fontWeight: "700", letterSpacing: 2.2, marginTop: 14, maxWidth: "82%", textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  detail: { color: "#E8C778", fontSize: 11, fontWeight: "600", letterSpacing: 1.4, marginTop: 5, textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
});
