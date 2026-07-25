import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import { AuthAlert, useAuthAlert } from "@/features/auth/auth-alert";
import { login, saveAuthSession } from "@/services/auth.service";
import { registerPushNotifications } from "@/services/push-notification.service";
import { startRealtime } from "@/services/realtime.service";
import { communityColors as colors } from "@/features/feed/community-colors";
import { spacing } from "@/theme";

export function LoginScreen() {
  const { alert, closeAlert, handleAlertAction, showAlert } = useAuthAlert();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginRequestIdRef = useRef(0);
  const isLoginPendingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      closeAlert();

      return () => {
        loginRequestIdRef.current += 1;
        isLoginPendingRef.current = false;
      };
    }, [closeAlert]),
  );

  const handleLogin = async () => {
    if (isLoginPendingRef.current) return;

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier || !password) {
      return showAlert({
        title: "Thông tin đăng nhập không chính xác",
        message: "Vui lòng kiểm tra lại email/số điện thoại và mật khẩu.",
      });
    }

    isLoginPendingRef.current = true;
    const requestId = ++loginRequestIdRef.current;
    setIsSubmitting(true);
    try {
      // Gọi API đăng nhập bằng email hoặc số điện thoại người dùng đã nhập.
      const session = await login({
        identifier: normalizedIdentifier,
        password,
      });

      await saveAuthSession(session);
      if (session.user !== null) {
        void startRealtime();
        void registerPushNotifications();
      }

      // Chưa có user thì hoàn thiện hồ sơ; đã có user thì vào trang chủ.
      router.replace(session.user === null ? "/complete-profile" : "/");
    } catch (error) {
      if (requestId !== loginRequestIdRef.current) return;

      showAlert({
        title: "Đăng nhập thất bại",
        message: error instanceof Error ? error.message : "Vui lòng thử lại.",
        kind: "error",
      });
    } finally {
      if (requestId === loginRequestIdRef.current) {
        isLoginPendingRef.current = false;
        setIsSubmitting(false);
      }
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
                Chào mừng trở lại
              </Text>
              <Text style={styles.subtitle}>
                Đăng nhập để tiếp tục trải nghiệm cùng chúng tôi
              </Text>
            </View>

            <View style={styles.card}>
              <AuthField
                autoCapitalize="none"
                autoComplete="username"
                icon="person-outline"
                keyboardType="default"
                label="Email hoặc số điện thoại"
                placeholder="example@email.com"
                onChangeText={setIdentifier}
                returnKeyType="next"
                textContentType="username"
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
                onSubmitEditing={handleLogin}
                returnKeyType="go"
                textContentType="password"
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

              {/* <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>Hoặc tiếp tục với</Text>
                <View style={styles.separatorLine} />
              </View> */}

              {/* <Pressable
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
              </Pressable> */}
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
    shadowColor: colors.glow,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  container: { gap: spacing.xl, maxWidth: 430, width: "100%" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  flex: { flex: 1 },
  forgotButton: { alignSelf: "flex-end", marginTop: -spacing.xs },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
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
  screen: { backgroundColor: colors.background, flex: 1 },
  separator: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  separatorLine: { backgroundColor: "#CCD3E0", flex: 1, height: 1 },
  separatorText: { color: colors.textMuted, fontSize: 12 },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
});
