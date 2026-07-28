import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


type Props = {
  message?: string;
};

export function NotificationEmpty({ message }: Props) {
  const { theme } = useTheme();
  const colors = theme.notifications;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.empty}>
      <Ionicons color={colors.primary} name="notifications-outline" size={44} />
      <Text style={styles.title}>{message || "Chưa có thông báo"}</Text>
      <Text style={styles.caption}>Kéo xuống để cập nhật danh sách mới nhất.</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  caption: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  empty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: spacing.md,
  },
});
