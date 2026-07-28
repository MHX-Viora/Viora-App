import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeModeSheet } from "@/components/profile/theme-mode-sheet";
import { spacing, type AppTheme, useTheme } from "@/theme";

const SETTINGS = [
  { action: "saved", icon: "bookmark-outline", label: "Đã lưu" },
  { action: "reacted", icon: "heart-outline", label: "Yêu thích" },
  { action: "support", icon: "help-circle-outline", label: "Hỗ trợ" },
  { action: "theme", icon: "color-palette-outline", label: "Giao diện" },
  {
    action: "security-privacy",
    icon: "shield-checkmark-outline",
    label: "Bảo mật & quyền",
  },
  {
    action: "account-settings",
    icon: "person-circle-outline",
    label: "Cài đặt tài khoản",
  },
  {
    action: "policies-terms",
    icon: "document-text-outline",
    label: "Chính sách & điều khoản",
  },
] as const;

export function ProfileSettingsSheet({
  onClose,
  onLogout,
  onOpenAccountSettings,
  onOpenLikedActivity,
  onOpenPoliciesTerms,
  onOpenSavedActivity,
  onOpenSecurityPrivacy,
  onOpenSupport,
  visible,
}: {
  onClose: () => void;
  onLogout: () => void;
  onOpenAccountSettings: () => void;
  onOpenLikedActivity: () => void;
  onOpenPoliciesTerms: () => void;
  onOpenSavedActivity: () => void;
  onOpenSecurityPrivacy: () => void;
  onOpenSupport: () => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [showThemeMode, setShowThemeMode] = useState(false);
  const { mode, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <>
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
          accessibilityLabel="Đóng menu cài đặt"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Cài đặt và hoạt động</Text>
            <Pressable
              accessibilityLabel="Đóng menu cài đặt"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons color={theme.colors.icon} name="close" size={26} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {SETTINGS.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.label}
                onPress={
                  item.action === "theme"
                    ? () => setShowThemeMode(true)
                    : item.action === "account-settings"
                    ? onOpenAccountSettings
                    : item.action === "saved"
                      ? onOpenSavedActivity
                      : item.action === "reacted"
                        ? onOpenLikedActivity
                        : item.action === "security-privacy"
                          ? onOpenSecurityPrivacy
                          : item.action === "policies-terms"
                            ? onOpenPoliciesTerms
                            : onOpenSupport
                }
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <Ionicons color={theme.colors.icon} name={item.icon} size={23} />
                <Text style={styles.rowText}>{item.label}</Text>
                {item.action === "theme" && (
                  <Text style={styles.valueText}>
                    {mode === "modern" ? "Hiện đại" : "Cổ điển"}
                  </Text>
                )}
                <Ionicons
                  color={theme.colors.textMuted}
                  name="chevron-forward"
                  size={19}
                />
              </Pressable>
            ))}
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              onPress={onLogout}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Ionicons
                color={theme.colors.danger}
                name="log-out-outline"
                size={23}
              />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </Pressable>
          </ScrollView>
        </View>
        </View>
      </Modal>
      <ThemeModeSheet
        onClose={() => setShowThemeMode(false)}
        visible={showThemeMode}
      />
    </>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: {
    backgroundColor: theme.colors.overlay,
    flex: 1,
    justifyContent: "flex-end",
  },
  divider: {
    backgroundColor: theme.colors.divider,
    height: 8,
    marginVertical: spacing.xs,
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
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    color: theme.colors.danger,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: { backgroundColor: theme.colors.secondaryBackground },
  rowText: { color: theme.colors.text, flex: 1, fontSize: 15, fontWeight: "600" },
  sheet: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: "82%",
    paddingTop: spacing.sm,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  valueText: { color: theme.colors.textMuted, fontSize: 13 },
});
