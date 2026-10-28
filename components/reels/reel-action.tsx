import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type ThemeColors, useTheme } from "@/theme";



type ReelActionProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  selected?: boolean;
  value?: string;
};

export function ReelAction({
  icon,
  label,
  onPress,
  selected,
  value,
}: ReelActionProps) {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const iconSize = icon === "heart" ? 36 : icon === "chatbubble" ? 30 : 24;
  const selectedColor =
    icon === "heart"
      ? colors.danger
      : icon === "bookmark"
        ? colors.visuals.hex_FBBF24
        : colors.primary;

  return (
    <View style={styles.actionGroup}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={styles.circleAction}
      >
        <Ionicons
          color={selected ? selectedColor : colors.white}
          name={icon}
          size={iconSize}
        />
      </Pressable>
      {value && <Text style={styles.actionValue}>{value}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  actionGroup: { alignItems: "center", gap: 0 },
  actionValue: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
    marginTop: -5,
  },
  circleAction: {
    alignItems: "center",
    height: 46,
    justifyContent: "center",
    width: 46,
  },
});
