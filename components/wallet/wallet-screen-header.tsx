import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, type ThemeColors, useTheme } from "@/theme";

export function WalletScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Quay lại" hitSlop={10} onPress={() => router.back()} style={styles.button}>
        <Ionicons color={theme.colors.text} name="arrow-back" size={24} />
      </Pressable>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      <View style={styles.button}>{right}</View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  title: { color: colors.text, flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
});
