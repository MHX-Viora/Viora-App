import { useMemo } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AuthBackground } from "@/components/auth/auth-background";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function AppLaunchScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View
      accessibilityLabel="Đang khởi động Viora"
      accessibilityRole="progressbar"
      style={styles.screen}
    >
      <AuthBackground compact />
      <View style={styles.center}>
        <View style={styles.logoFrame}>
          <Image
            accessibilityLabel="Logo Viora"
            contentFit="contain"
            source={require("../../assets/images/viora_logo.png")}
            style={styles.logo}
          />
        </View>
        <Text style={styles.brand}>viora</Text>
        <Text style={styles.tagline}>Kết nối với thế giới tương lai</Text>
      </View>
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.loadingText}>Đang chuẩn bị trải nghiệm...</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  brand: {
    color: colors.visuals.hex_071A38,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 2.4,
    marginTop: spacing.lg,
  },
  center: { alignItems: "center" },
  loading: {
    alignItems: "center",
    bottom: 54,
    gap: spacing.sm,
    position: "absolute",
  },
  loadingText: { color: colors.visuals.hex_52637A, fontSize: 12, letterSpacing: 0.4 },
  logo: {
    backgroundColor: colors.white,
    borderRadius: 24,
    height: 88,
    width: 88,
  },
  logoFrame: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_36_221_228_0_10,
    borderColor: colors.visuals.rgb_36_221_228_0_55,
    borderRadius: 34,
    borderWidth: 1,
    height: 108,
    justifyContent: "center",
    shadowColor: colors.glow,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 22,
    width: 108,
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.white,
    justifyContent: "center",
    zIndex: 100,
  },
  tagline: { color: colors.visuals.hex_52637A, fontSize: 14, marginTop: spacing.xs },
});
