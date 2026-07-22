import Ionicons from "@expo/vector-icons/Ionicons";
import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";

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
  const selectedColor = icon === "heart" ? colors.danger : colors.primary;

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
          size={31}
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
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 14,
    marginTop: -8,
  },
  circleAction: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
});
