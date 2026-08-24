import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { spacing, type ThemeColors, useTheme } from "@/theme";

export function WebCallUnavailable({ title }: { title: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <View style={styles.screen}>
      <View accessibilityRole="alert" style={styles.card}>
        <View style={styles.icon}>
          <Ionicons color={theme.colors.primary} name="call-outline" size={30} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          Cuộc gọi này hiện chỉ khả dụng trên ứng dụng ANKT cho Android và iOS.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)/chat")}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Quay lại trò chuyện</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 12,
      minHeight: 44,
      justifyContent: "center",
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    buttonPressed: { backgroundColor: colors.primaryPressed },
    buttonText: {
      color: colors.primaryContrast,
      fontSize: 14,
      fontWeight: "800",
    },
    card: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      gap: spacing.md,
      maxWidth: 440,
      padding: spacing.xl,
      width: "100%",
    },
    description: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
    },
    icon: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: 28,
      height: 56,
      justifyContent: "center",
      width: 56,
    },
    screen: {
      alignItems: "center",
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: "center",
      padding: spacing.lg,
    },
    title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  });
