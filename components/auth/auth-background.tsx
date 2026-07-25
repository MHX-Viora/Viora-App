import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { communityColors as colors } from "@/features/feed/community-colors";
import { spacing } from "@/theme";

export function AuthBackground({ compact = false }: { compact?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.cyanGlow} />
      <View style={styles.purpleGlow} />
      <View style={styles.orbitLarge} />
      <View style={styles.orbitSmall} />
      {!compact && (
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons color={colors.primaryContrast} name="sparkles" size={24} />
          </View>
          <Text style={styles.brandName}>viora</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    left: spacing.xl,
    position: "absolute",
    top: spacing.xl,
  },
  brandName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  cyanGlow: {
    backgroundColor: "rgba(36, 221, 228, 0.16)",
    borderRadius: 180,
    height: 330,
    position: "absolute",
    right: -150,
    top: -105,
    width: 330,
  },
  logo: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    width: 42,
  },
  orbitLarge: {
    borderColor: "rgba(36, 221, 228, 0.12)",
    borderRadius: 260,
    borderWidth: 1,
    height: 520,
    left: -260,
    position: "absolute",
    top: 115,
    width: 520,
  },
  orbitSmall: {
    borderColor: "rgba(152, 80, 232, 0.16)",
    borderRadius: 150,
    borderWidth: 1,
    bottom: -65,
    height: 300,
    position: "absolute",
    right: -130,
    width: 300,
  },
  purpleGlow: {
    backgroundColor: "rgba(152, 80, 232, 0.14)",
    borderRadius: 210,
    bottom: -150,
    height: 410,
    left: -175,
    position: "absolute",
    width: 410,
  },
});
