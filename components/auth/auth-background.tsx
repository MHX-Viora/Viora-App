import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function AuthBackground({ compact = false }: { compact?: boolean }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {!compact && (
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons color={colors.primaryContrast} name="sparkles" size={24} />
          </View>
          <Text style={styles.brandName}>ANKT</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  logo: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    width: 42,
  },
});
