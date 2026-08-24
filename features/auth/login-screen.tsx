import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState, useMemo } from "react";
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
import { GoogleLogo } from "@/components/auth/google-logo";
import { TmiSponsor } from "@/components/common/tmi-sponsor";
import { AuthAlert, useAuthAlert } from "@/features/auth/auth-alert";
import { googleLogin, login, saveAuthSession } from "@/services/auth.service";
import { getGoogleFirebaseToken } from "@/services/google-auth.service";
import { registerPushNotifications } from "@/services/push-notification.service";
import { startRealtime } from "@/services/realtime.service";
import { spacing } from "@/theme";
import { type AppTheme, useTheme } from "@/theme";

// Play App Signing and upload certificate fingerprints are registered for OAuth.
const GOOGLE_LOGIN_ENABLED = true;

export function LoginScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  const handleGoogleLogin = async () => {
    if (isLoginPendingRef.current) return;

    isLoginPendingRef.current = true;
    const requestId = ++loginRequestIdRef.current;
    setIsSubmitting(true);
    try {
      const firebaseToken = await getGoogleFirebaseToken();
      if (!firebaseToken) return;

      const session = await googleLogin(firebaseToken);
      await saveAuthSession(session);
      if (session.user !== null) {
        void startRealtime();
        void registerPushNotifications();
      }
      router.replace(session.user === null ? "/complete-profile" : "/");
    } catch (error) {
      if (requestId !== loginRequestIdRef.current) return;
      showAlert({
        title: "Đăng nhập Google thất bại",
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
                onPress={() => router.push("/forgot-password")}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </Pressable>
              <AuthPrimaryButton
                isLoading={isSubmitting}
                label="Đăng nhập"
                onPress={handleLogin}
              />

              {GOOGLE_LOGIN_ENABLED && (
                <>
                  <View style={styles.separator}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>Hoặc tiếp tục với</Text>
                    <View style={styles.separatorLine} />
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Đăng nhập bằng Google"
                    accessibilityState={{ disabled: isSubmitting }}
                    disabled={isSubmitting}
                    onPress={handleGoogleLogin}
                    style={({ pressed }) => [
                      styles.googleButton,
                      pressed && !isSubmitting && styles.googleButtonPressed,
                      isSubmitting && styles.disabled,
                    ]}
                  >
                    <View style={styles.googleIconWrap}>
                      <GoogleLogo size={21} />
                    </View>
                    <Text style={styles.googleText}>Tiếp tục với Google</Text>
                  </Pressable>
                </>
              )}
            </View>

            <AuthFooterLink
              action="Đăng ký ngay"
              onPress={() => router.push("/register")}
              prompt="Bạn chưa có tài khoản?"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <TmiSponsor style={styles.sponsor} />
      <AuthAlert
        alert={alert}
        onAction={handleAlertAction}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => {
  const { colors, effects } = theme;

  return StyleSheet.create({
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
    alignItems: "center",
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
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: Math.min(effects.cardRadius, 14),
    borderWidth: 1,
    elevation: effects.shadow.elevation,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    shadowColor: effects.shadow.shadowColor,
    shadowOffset: effects.shadow.shadowOffset,
    shadowOpacity: effects.shadow.shadowOpacity,
    shadowRadius: effects.shadow.shadowRadius,
  },
  googleButtonPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    transform: [{ scale: 0.985 }],
  },
  googleIconWrap: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  googleText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  heading: { alignItems: "center", gap: spacing.xs },
  disabled: { opacity: 0.55 },
  screen: { backgroundColor: colors.background, flex: 1 },
  separator: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  separatorLine: { backgroundColor: colors.divider, flex: 1, height: 1 },
  separatorText: { color: colors.textMuted, fontSize: 12 },
  sponsor: {
    paddingBottom: spacing.sm,
  },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  });
};
