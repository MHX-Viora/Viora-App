import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { spacing, type AppTheme, useTheme } from "@/theme";

type CompleteProfileLogoutDialogProps = {
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
};

export function CompleteProfileLogoutDialog({
  isLoading,
  onCancel,
  onConfirm,
  visible,
}: CompleteProfileLogoutDialogProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleRequestClose = () => {
    if (!isLoading) onCancel();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleRequestClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Ở lại hoàn thiện hồ sơ"
          disabled={isLoading}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={styles.card}
        >
          <View style={styles.iconContainer}>
            <Ionicons color={colors.danger} name="log-out-outline" size={30} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Thoát tài khoản?</Text>
            <Text style={styles.message}>
              Thông tin bạn đang nhập chưa được hoàn tất. Bạn có muốn đăng xuất để
              sử dụng tài khoản khác không?
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading }}
              disabled={isLoading}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryLabel}>Ở lại</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isLoading, disabled: isLoading }}
              disabled={isLoading}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.pressed,
                isLoading && styles.disabled,
              ]}
            >
              {isLoading ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator color={colors.danger} size="small" />
                  <Text style={styles.logoutLabel}>Đang đăng xuất...</Text>
                </View>
              ) : (
                <Text style={styles.logoutLabel}>Đăng xuất</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => {
  const { colors, effects } = theme;

  return StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.sm, width: "100%" },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: effects.cardRadius,
    borderWidth: 1,
    gap: spacing.lg,
    maxWidth: 360,
    padding: spacing.xl,
    ...effects.shadow,
    width: "100%",
  },
  copy: { alignItems: "center", gap: spacing.sm },
  disabled: { opacity: 0.65 },
  iconContainer: {
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  loadingContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  logoutLabel: { color: colors.danger, fontSize: 15, fontWeight: "800" },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  overlay: {
    alignItems: "center",
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  pressed: { opacity: 0.78 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  secondaryLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  });
};
