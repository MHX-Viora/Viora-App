import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppToast } from "@/components/common/app-toast";
import { useUserSettings } from "@/hooks/use-user-settings";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";
import { LegalDocumentType } from "@/types/legal";


function SettingsSkeleton() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonText} />
        <View style={styles.skeletonControl} />
      </View>
    </View>
  );
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function AccountSettingsScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    draft,
    error,
    isDirty,
    isLoading,
    isSaving,
    load,
    save,
    setValue,
  } = useUserSettings();
  const disabled = isSaving || isLoading;

  const submit = async () => {
    try {
      await save();
      showAppToast({ message: "Cập nhật thành công.", type: "success" });
    } catch (saveError) {
      showAppToast({
        message:
          saveError instanceof Error
            ? saveError.message
            : "Không thể cập nhật cài đặt.",
        type: "error",
      });
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Cài đặt tài khoản</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <SettingsSkeleton />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryButton}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : draft ? (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: Math.max(
                  spacing.xl,
                  insets.bottom + (isDirty ? 96 : spacing.xl),
                ),
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Section title="Tin nhắn">
              <View style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>
                    Người lạ bắt đầu tin nhắn
                  </Text>
                  <Text style={styles.rowDescription}>
                    Nếu tắt, chỉ bạn bè mới có thể bắt đầu nhắn tin.
                  </Text>
                </View>
                <Switch
                  disabled={disabled}
                  onValueChange={(value) =>
                    setValue("allowMessageEveryone", value)
                  }
                  thumbColor={colors.white}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  value={draft.allowMessageEveryone}
                />
              </View>
            </Section>
            <Section title="Bảo mật">
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/change-password")}
                style={({ pressed }) => [styles.row, pressed && styles.pressedRow]}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>Đổi mật khẩu</Text>
                  <Text style={styles.rowDescription}>
                    Cập nhật mật khẩu đăng nhập cho tài khoản của bạn.
                  </Text>
                </View>
                <Ionicons
                  color={colors.textMuted}
                  name="chevron-forward"
                  size={20}
                />
              </Pressable>
            </Section>
            <Section title="Pháp lý">
              {[
                ["Điều khoản sử dụng", LegalDocumentType.TermsOfService],
                ["Chính sách bảo mật", LegalDocumentType.PrivacyPolicy],
                ["Quyền truy cập ứng dụng", LegalDocumentType.PermissionPolicy],
              ].map(([label, type]) => (
                <Pressable
                  accessibilityRole="button"
                  key={String(type)}
                  onPress={() => router.push(`/legal/${type}` as Href)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressedRow]}
                >
                  <Text style={styles.rowTitle}>{label}</Text>
                  <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
                </Pressable>
              ))}
            </Section>
          </ScrollView>

          {isDirty ? (
            <View
              style={[
                styles.saveBar,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => void submit()}
                style={[styles.saveButton, isSaving && styles.disabledButton]}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.primaryContrast} />
                ) : (
                  <Text style={styles.saveText}>Lưu</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    padding: spacing.md,
    rowGap: spacing.md,
  },
  disabledButton: { opacity: 0.7 },
  errorText: {
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressedRow: { opacity: 0.72 },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.primaryContrast, fontWeight: "700" },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowCopy: { flex: 1, paddingRight: spacing.md },
  rowDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  rowTitle: { color: colors.text, flexShrink: 1, fontSize: 15, fontWeight: "700" },
  saveBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    position: "absolute",
    right: 0,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  saveText: {
    color: colors.primaryContrast,
    fontSize: 16,
    fontWeight: "800",
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  section: { gap: spacing.xs },
  sectionBody: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.visuals.rgb_152_80_232_0_56,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: spacing.xs,
    textTransform: "uppercase",
  },
  skeletonContent: { gap: spacing.md, padding: spacing.md },
  skeletonControl: {
    backgroundColor: colors.border,
    borderRadius: 14,
    height: 28,
    width: 52,
  },
  skeletonRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 72,
    padding: spacing.md,
  },
  skeletonText: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 18,
    width: "58%",
  },
});
