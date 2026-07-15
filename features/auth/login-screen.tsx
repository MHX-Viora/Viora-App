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
import { AuthAlert, useAuthAlert } from "@/features/auth/auth-alert";
import { login, saveAuthSession } from "@/services/auth.service";
import { colors, spacing } from "@/theme";

export function LoginScreen() {
  const { alert, closeAlert, handleAlertAction, showAlert } = useAuthAlert();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier || !password) {
      return showAlert({
        title: "Thông tin đăng nhập không chính xác",
        message: "Vui lòng kiểm tra lại email/số điện thoại và mật khẩu.",
      });
    }

    setIsSubmitting(true);
    try {
      // Gọi API đăng nhập bằng email hoặc số điện thoại người dùng đã nhập.
      const session = await login({
        identifier: normalizedIdentifier,
        password,
      });

      await saveAuthSession(session);

      // Chưa có user thì hoàn thiện hồ sơ; đã có user thì vào trang chủ.
      router.replace(session.user === null ? "/complete-profile" : "/");
    } catch (error) {
      showAlert({
        title: "Đăng nhập thất bại",
        message: error instanceof Error ? error.message : "Vui lòng thử lại.",
        kind: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" style={styles.blueGlow} />
      <View pointerEvents="none" style={styles.cyanGlow} />
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
                Chào mừng trở lại
              </Text>
              <Text style={styles.subtitle}>
                Đăng nhập để tiếp tục trải nghiệm cùng chúng tôi
              </Text>
            </View>

            <View style={styles.card}>
              <AuthField
                autoCapitalize="none"
                autoComplete="email"
                icon="person-outline"
                keyboardType="email-address"
                label="Email hoặc Tên đăng nhập"
                placeholder="example@email.com"
                onChangeText={setIdentifier}
                value={identifier}
              />
              <AuthField
                autoCapitalize="none"
                autoComplete="password"
                icon="lock-closed-outline"
                label="Mật khẩu"
                placeholder="••••••••"
                secure
                onChangeText={setPassword}
                value={password}
              />
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </Pressable>
              <AuthPrimaryButton
                isLoading={isSubmitting}
                label="Đăng nhập"
                onPress={handleLogin}
              />

              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>Hoặc tiếp tục với</Text>
                <View style={styles.separatorLine} />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  showAlert({
                    title: "Chưa hỗ trợ",
                    message: "API đăng nhập Google chưa được cung cấp.",
                  })
                }
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons color="#4285F4" name="logo-google" size={22} />
                <Text style={styles.googleText}>Đăng nhập Google</Text>
              </Pressable>
            </View>

            <AuthFooterLink
              action="Đăng ký ngay"
              onPress={() => router.push("/register")}
              prompt="Bạn chưa có tài khoản?"
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
  blueGlow: {
    backgroundColor: "#DDE4FF",
    borderRadius: 220,
    height: 440,
    left: -110,
    position: "absolute",
    right: -30,
    top: -180,
    transform: [{ rotate: "-12deg" }],
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
    shadowColor: "#5D7396",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  container: { gap: spacing.xl, maxWidth: 430, width: "100%" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  cyanGlow: {
    backgroundColor: "#E1FBFC",
    borderRadius: 240,
    bottom: -170,
    height: 400,
    left: -60,
    position: "absolute",
    right: -110,
    transform: [{ rotate: "10deg" }],
  },
  flex: { flex: 1 },
  forgotButton: { alignSelf: "flex-end", marginTop: -spacing.xs },
  forgotText: { color: "#3157B7", fontSize: 13, fontWeight: "700" },
  googleButton: {
    alignItems: "center",
    backgroundColor: "#E7EEFC",
    borderColor: "#CBD6EB",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    minHeight: 50,
  },
  googleText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  heading: { alignItems: "center", gap: spacing.xs },
  pressed: { opacity: 0.8 },
  screen: { backgroundColor: "#F4F7FF", flex: 1 },
  separator: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  separatorLine: { backgroundColor: "#CCD3E0", flex: 1, height: 1 },
  separatorText: { color: colors.textMuted, fontSize: 12 },
  subtitle: { color: "#304263", fontSize: 14, textAlign: "center" },
  title: { color: "#071A38", fontSize: 26, fontWeight: "900" },
});
