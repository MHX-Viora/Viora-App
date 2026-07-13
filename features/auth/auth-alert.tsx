import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";
import type { AuthAlertOptions, AuthAlertProps } from "@/types/auth";

const alertStyles = {
  error: {
    backgroundColor: "#FFF0F3",
    color: colors.danger,
    icon: "alert-circle" as const,
  },
  info: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    icon: "information-circle" as const,
  },
  success: {
    backgroundColor: "#EAF8F0",
    color: "#168A51",
    icon: "checkmark-circle" as const,
  },
};

export function useAuthAlert() {
  const [alert, setAlert] = useState<AuthAlertOptions | null>(null);

  const showAlert = (options: AuthAlertOptions) => setAlert(options);
  const closeAlert = () => setAlert(null);
  const handleAlertAction = () => {
    const onAction = alert?.onAction;
    setAlert(null);
    onAction?.();
  };

  return { alert, closeAlert, handleAlertAction, showAlert };
}

export function AuthAlert({
  alert,
  onAction,
  onClose,
}: AuthAlertProps) {
  if (!alert) return null;

  const appearance = alertStyles[alert.kind ?? "info"];
  const hasAction = Boolean(alert.onAction);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Đóng thông báo"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityRole="alert" style={styles.card}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: appearance.backgroundColor },
            ]}
          >
            <Ionicons
              color={appearance.color}
              name={appearance.icon}
              size={34}
            />
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>{alert.title}</Text>
            <Text style={styles.message}>{alert.message}</Text>
          </View>

          <View style={styles.actions}>
            {hasAction && (
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryLabel}>Để sau</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={hasAction ? onAction : onClose}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryLabel}>
                {alert.actionLabel ?? "Đã hiểu"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.sm, width: "100%" },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.lg,
    maxWidth: 360,
    padding: spacing.xl,
    shadowColor: "#101828",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    width: "100%",
  },
  copy: { alignItems: "center", gap: spacing.sm },
  iconContainer: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(13, 24, 37, 0.52)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  pressed: { opacity: 0.78 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
  },
  primaryLabel: { color: colors.white, fontSize: 15, fontWeight: "800" },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
  },
  secondaryLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
});
