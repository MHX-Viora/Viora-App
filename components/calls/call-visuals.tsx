import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { communityColors as colors } from "@/features/feed/community-colors";

export function CallBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.cyanGlow} />
      <View style={styles.purpleGlow} />
      <View style={styles.arcLeft} />
      <View style={styles.arcRight} />
    </View>
  );
}

export function CallAvatarHalo({
  children,
  size = 232,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <View style={[styles.halo, { height: size, width: size }]}>
      <View style={[styles.ring, styles.outerRing]} />
      <View style={[styles.ring, styles.middleRing]} />
      <View style={[styles.ring, styles.innerRing]} />
      <View style={styles.avatarContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  arcLeft: {
    borderColor: "rgba(36, 221, 228, 0.13)",
    borderRadius: 260,
    borderWidth: 1,
    height: 520,
    left: -350,
    position: "absolute",
    top: 70,
    width: 520,
  },
  arcRight: {
    borderColor: "rgba(152, 80, 232, 0.16)",
    borderRadius: 230,
    borderWidth: 1,
    bottom: -170,
    height: 460,
    position: "absolute",
    right: -300,
    width: 460,
  },
  avatarContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  cyanGlow: {
    backgroundColor: "rgba(36, 221, 228, 0.12)",
    borderRadius: 180,
    height: 360,
    position: "absolute",
    right: -190,
    top: -100,
    width: 360,
  },
  halo: { alignItems: "center", justifyContent: "center" },
  innerRing: {
    borderColor: colors.glow,
    height: "58%",
    shadowColor: colors.glow,
    width: "58%",
  },
  middleRing: {
    borderColor: "rgba(36, 221, 228, 0.86)",
    height: "78%",
    shadowColor: colors.primary,
    width: "78%",
  },
  outerRing: {
    borderColor: "rgba(36, 221, 228, 0.52)",
    height: "98%",
    shadowColor: colors.primary,
    width: "98%",
  },
  purpleGlow: {
    backgroundColor: "rgba(152, 80, 232, 0.12)",
    borderRadius: 190,
    bottom: -140,
    height: 380,
    left: -170,
    position: "absolute",
    width: 380,
  },
  ring: {
    borderRadius: 999,
    borderWidth: 2,
    position: "absolute",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
  },
});
