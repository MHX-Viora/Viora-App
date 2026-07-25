import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AuthField,
  AuthFooterLink,
  AuthPrimaryButton,
} from "@/components/auth/auth-controls";
import { AuthBackground } from "@/components/auth/auth-background";
import { showAppToast } from "@/components/common/app-toast";
import { AuthAlert, useAuthAlert } from "@/features/auth/auth-alert";
import { register } from "@/services/auth.service";
import { communityColors as colors } from "@/features/feed/community-colors";
import { spacing } from "@/theme";

export function RegisterScreen() {
  const { alert, closeAlert, handleAlertAction, showAlert } = useAuthAlert();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleRegister = async () => {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier)
      return showAlert({
        title: "Thông tin đăng ký không chính xác",
        message: "Vui lòng kiểm tra lại email hoặc số điện thoại.",
      });
    if (password.length < 8 || password.length > 128) {
      return showAlert({
        title: "Mật khẩu không hợp lệ",
        message: "Mật khẩu phải dài từ 8 đến 128 ký tự.",
      });
    }
    if (password !== confirmPassword)
      return showAlert({
        title: "Mật khẩu không khớp",
        message: "Hãy nhập lại mật khẩu.",
      });
    if (!termsAccepted)
      return showAlert({
        title: "Chưa đồng ý điều khoản",
        message: "Bạn cần đồng ý điều khoản để đăng ký.",
      });

    setIsSubmitting(true);
    try {
      // Gọi API đăng ký sau khi dữ liệu trên form đã hợp lệ.
      await register({
        identifier: normalizedIdentifier,
        password,
      });
      showAppToast({
        title: "Đăng ký thành công",
        message: "Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.",
        type: "success",
      });
      router.replace("/login");
    } catch (error) {
      showAlert({
        title: "Đăng ký thất bại",
        message: error instanceof Error ? error.message : "Vui lòng thử lại.",
        kind: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AuthBackground compact />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                Tạo tài khoản mới
              </Text>
              <Text style={styles.subtitle}>
                Gia nhập cộng đồng chuyên nghiệp ngay hôm nay.
              </Text>
            </View>

            <View style={styles.form}>
              <AuthField
                autoCapitalize="none"
                autoComplete="email"
                icon="mail-outline"
                keyboardType="email-address"
                label="Email hoặc số điện thoại"
                placeholder="example@gmail.com"
                onChangeText={setIdentifier}
                value={identifier}
              />
              <AuthField
                autoCapitalize="none"
                autoComplete="new-password"
                icon="lock-closed-outline"
                label="Mật khẩu"
                placeholder="••••••••"
                secure
                onChangeText={setPassword}
                value={password}
              />
              <AuthField
                autoCapitalize="none"
                autoComplete="new-password"
                icon="lock-closed-outline"
                label="Xác nhận mật khẩu"
                placeholder="••••••••"
                secure
                onChangeText={setConfirmPassword}
                value={confirmPassword}
              />

              <View style={styles.termsRow}>
                <Pressable
                  accessibilityLabel="Đồng ý với điều khoản dịch vụ và chính sách bảo mật"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: termsAccepted }}
                  hitSlop={8}
                  onPress={() => setTermsAccepted((current) => !current)}
                  style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxChecked,
                  ]}
                >
                  {termsAccepted && (
                    <Ionicons color={colors.white} name="checkmark" size={14} />
                  )}
                </Pressable>
                <Text style={styles.termsText}>
                  Tôi đồng ý với {""}
                  <Text style={styles.linkText}>
                    Điều khoản dịch vụ
                  </Text> và {""}
                  <Text style={styles.linkText}>Chính sách bảo mật</Text>.
                </Text>
              </View>

              <AuthPrimaryButton
                isLoading={isSubmitting}
                label="Đăng ký"
                onPress={handleRegister}
              />
            </View>

            <AuthFooterLink
              action="Đăng nhập ngay"
              onPress={() => router.replace("/login")}
              prompt="Đã có tài khoản?"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AuthAlert
        alert={alert}
        onAction={handleAlertAction}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    marginTop: 1,
    width: 18,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  container: { gap: 36, maxWidth: 430, width: "100%" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  flex: { flex: 1 },
  form: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
    shadowColor: colors.glow,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  heading: { alignItems: "center", gap: spacing.xs },
  linkText: {
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  termsRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  termsText: { color: colors.text, flex: 1, fontSize: 14, lineHeight: 20 },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
});
