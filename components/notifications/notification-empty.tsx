import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


type Props = {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
};

export function NotificationEmpty({ message, onRetry, isRetrying = false }: Props) {
  const { theme } = useTheme();
  const colors = theme.notifications;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.empty}>
      <Ionicons color={colors.primary} name="notifications-outline" size={44} />
      <Text style={styles.title}>{message || "Chưa có thông báo"}</Text>
      <Text style={styles.caption}>
        {message ? "Kiểm tra kết nối và thử tải lại danh sách." : "Kéo xuống để cập nhật danh sách mới nhất."}
      </Text>
      {message && onRetry ? (
        <Pressable
          accessibilityLabel="Thử tải lại thông báo"
          accessibilityRole="button"
          accessibilityState={{ disabled: isRetrying }}
          disabled={isRetrying}
          onPress={onRetry}
          style={styles.retry}
        >
          <Text style={styles.retryText}>{isRetrying ? "Đang tải…" : "Thử lại"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  retry: {
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  retryText: { color: colors.primary, fontWeight: "700" },
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
    textAlign: "center",
  },
});
