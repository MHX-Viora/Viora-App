import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  spacing,
  type AppTheme,
  type ThemeMode,
  useTheme,
} from "@/theme";

const THEME_OPTIONS: readonly {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  mode: ThemeMode;
}[] = [
  {
    description: "Dark, cyan, neon và glassmorphism",
    icon: "moon-outline",
    label: "Hiện đại",
    mode: "modern",
  },
  {
    description: "Nền sáng, xanh dương và thiết kế phẳng",
    icon: "sunny-outline",
    label: "Cổ điển",
    mode: "classic",
  },
];

export function ThemeModeSheet({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { mode, setMode, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Đóng lựa chọn giao diện"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.xl) },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Giao diện</Text>
              <Text style={styles.subtitle}>Chọn phong cách hiển thị</Text>
            </View>
            <Pressable
              accessibilityLabel="Đóng lựa chọn giao diện"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons color={theme.colors.icon} name="close" size={26} />
            </Pressable>
          </View>

          {THEME_OPTIONS.map((option) => {
            const selected = option.mode === mode;
            return (
              <Pressable
                accessibilityLabel={`${option.label}${selected ? ", đang chọn" : ""}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option.mode}
                onPress={() => void setMode(option.mode)}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={styles.optionIcon}>
                  <Ionicons
                    color={selected ? theme.colors.primary : theme.colors.icon}
                    name={option.icon}
                    size={24}
                  />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{option.label}</Text>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
                <Ionicons
                  color={
                    selected ? theme.colors.primary : theme.colors.textMuted
                  }
                  name={selected ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "flex-end",
    },
    handle: {
      alignSelf: "center",
      backgroundColor: theme.colors.divider,
      borderRadius: 2,
      height: 4,
      marginBottom: spacing.md,
      width: 40,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    option: {
      alignItems: "center",
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.effects.cardRadius,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.sm,
      marginHorizontal: spacing.lg,
      minHeight: 72,
      paddingHorizontal: spacing.md,
    },
    optionCopy: { flex: 1 },
    optionDescription: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    optionIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.effects.cardRadius,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    optionPressed: { backgroundColor: theme.colors.secondaryBackground },
    optionSelected: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primary,
    },
    optionTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    sheet: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderTopLeftRadius: theme.effects.cardRadius,
      borderTopRightRadius: theme.effects.cardRadius,
      borderWidth: 1,
      paddingTop: spacing.sm,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    title: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  });
