import Ionicons from "@expo/vector-icons/Ionicons";
import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { reelsColors as colors } from "@/features/reels/reels-colors";

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
  const selectedColor =
    icon === "heart"
      ? colors.danger
      : icon === "bookmark"
        ? "#FBBF24"
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
          size={24}
        />
      </Pressable>
      {value && <Text style={styles.actionValue}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 23,
    borderWidth: 1,
    elevation: 5,
    height: 46,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    width: 46,
  },
});
