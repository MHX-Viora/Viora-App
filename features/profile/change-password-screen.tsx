import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppToast } from "@/components/common/app-toast";
import { changePassword } from "@/services/account.service";
import { clearAuthSession } from "@/services/auth.service";
import { colors, spacing } from "@/theme";

export function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    !isSubmitting;

  const submit = async () => {
    if (isSubmitting) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showAppToast({ message: "Vui lòng nhập đầy đủ thông tin.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      showAppToast({ message: "Mật khẩu xác nhận không khớp.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      const message = await changePassword({
        confirmPassword,
        currentPassword,
        newPassword,
      });
      await clearAuthSession();
      showAppToast({ message, type: "success" });
      router.replace("/login");
    } catch (error) {
      showAppToast({
        message:
          error instanceof Error ? error.message : "Đổi mật khẩu thất bại.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
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
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={styles.iconButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + spacing.xl, spacing.xl) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <PasswordField
              label="Mật khẩu hiện tại"
              onChangeText={setCurrentPassword}
              placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword}
            />
            <PasswordField
              label="Mật khẩu mới"
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
            />
            <PasswordField
              label="Xác nhận mật khẩu mới"
              onChangeText={setConfirmPassword}
              onSubmitEditing={() => void submit()}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => void submit()}
            style={[styles.submitButton, !canSubmit && styles.disabledButton]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Cập nhật mật khẩu</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  onChangeText,
  onSubmitEditing,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  value: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <Ionicons color={colors.textMuted} name="lock-closed-outline" size={20} />
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoComplete="password"
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType={onSubmitEditing ? "done" : "next"}
          secureTextEntry={!isVisible}
          style={styles.input}
          textContentType="password"
          value={value}
        />
        <Pressable
          accessibilityLabel={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setIsVisible((current) => !current)}
        >
          <Ionicons
            color={colors.textMuted}
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={22}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
  },
  disabledButton: { opacity: 0.55 },
  field: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  fieldGroup: { gap: spacing.xs },
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
  input: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 12 },
  keyboardView: { flex: 1 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700" },
  screen: { backgroundColor: colors.background, flex: 1 },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  submitText: { color: colors.white, fontSize: 16, fontWeight: "800" },
});
