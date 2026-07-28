import Ionicons from "@expo/vector-icons/Ionicons";
import {
  getAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signOut,
} from "@react-native-firebase/auth";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
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

import { AuthBackground } from "@/components/auth/auth-background";
import { AuthField, AuthPrimaryButton } from "@/components/auth/auth-controls";
import { AuthAlert, useAuthAlert } from "@/features/auth/auth-alert";
import { communityColors as colors } from "@/features/feed/community-colors";
import {
  getForgotPasswordStatus,
  resetForgottenPassword,
} from "@/services/auth.service";
import { spacing } from "@/theme";

type Step = "identifier" | "password" | "otp" | "email-sent";
type VerificationMethod = "email" | "phone";

const PENDING_EMAIL_KEY = "forgot-password-email";
const EMAIL_LINK_URL =
  process.env.EXPO_PUBLIC_FIREBASE_EMAIL_LINK_URL ??
  "https://com-quyentrinh-viora.firebaseapp.com";

const normalizePhone = (input: string) => {
  let value = input.trim().replace(/[\s()-]/g, "");
  if (/^0\d{8,10}$/.test(value)) value = `+84${value.slice(1)}`;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
};

const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const validatePassword = (password: string, confirmation: string) => {
  if (password !== confirmation) return "Hai mật khẩu không khớp.";
  if (password.length < 8 || password.length > 100) {
    return "Mật khẩu phải từ 8-100 ký tự.";
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return "Mật khẩu phải có chữ hoa, chữ thường và ít nhất một số.";
  }
  return null;
};

export function ForgotPasswordScreen() {
  const incomingUrl = Linking.useURL();
  const { alert, closeAlert, handleAlertAction, showAlert } = useAuthAlert();
  const handledEmailLinkRef = useRef<string | null>(null);
  const confirmationRef = useRef<Awaited<
    ReturnType<typeof signInWithPhoneNumber>
  > | null>(null);
  const [step, setStep] = useState<Step>("identifier");
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!incomingUrl || handledEmailLinkRef.current === incomingUrl) return;
    handledEmailLinkRef.current = incomingUrl;

    const completeEmailVerification = async () => {
      const auth = getAuth();
      if (!(await isSignInWithEmailLink(auth, incomingUrl))) return;

      const pendingEmail = await SecureStore.getItemAsync(PENDING_EMAIL_KEY);
      if (!pendingEmail) {
        showAlert({
          kind: "error",
          message: "Hãy mở link trên đúng thiết bị đã yêu cầu đổi mật khẩu.",
          title: "Không tìm thấy email xác minh",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const credential = await signInWithEmailLink(auth, pendingEmail, incomingUrl);
        const token = await credential.user.getIdToken(true);
        await SecureStore.deleteItemAsync(PENDING_EMAIL_KEY);
        setIdentifier(pendingEmail);
        setMethod("email");
        setFirebaseToken(token);
        setStep("password");
        showAlert({
          kind: "success",
          message: "Email đã được xác minh. Hãy xác nhận mật khẩu mới.",
          title: "Xác minh thành công",
        });
      } catch {
        showAlert({
          kind: "error",
          message: "Link xác minh không hợp lệ hoặc đã hết hạn.",
          title: "Xác minh thất bại",
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    void completeEmailVerification();
  }, [incomingUrl, showAlert]);

  const lookupAccount = async () => {
    const value = identifier.trim();
    if (!value) {
      return showAlert({
        kind: "error",
        message: "Vui lòng nhập email hoặc số điện thoại.",
        title: "Thiếu thông tin",
      });
    }

    setIsSubmitting(true);
    try {
      const result = await getForgotPasswordStatus(value);
      if (isEmail(value)) {
        setIdentifier(value.toLowerCase());
        setMethod("email");
      } else {
        const normalized = normalizePhone(result.phoneNumber ?? value);
        if (!normalized) throw new Error("Số điện thoại không hợp lệ.");
        setPhoneNumber(normalized);
        setMethod("phone");
      }
      setFirebaseToken(null);
      setStep("password");
    } catch (error) {
      showAlert({
        kind: "error",
        message: error instanceof Error ? error.message : "Không tìm thấy tài khoản.",
        title: "Không thể tiếp tục",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWithToken = async (token: string) => {
    await resetForgottenPassword({
      firebaseToken: token,
      identifier: method === "phone" ? phoneNumber : identifier,
      newPassword,
    });
    await signOut(getAuth()).catch(() => undefined);
    showAlert({
      actionLabel: "Đăng nhập",
      kind: "success",
      message: "Mật khẩu đã được đổi. Vui lòng đăng nhập lại.",
      onAction: () => router.replace("/login"),
      title: "Đổi mật khẩu thành công",
    });
  };

  const startVerification = async () => {
    const passwordError = validatePassword(newPassword, confirmPassword);
    if (passwordError) {
      return showAlert({
        kind: "error",
        message: passwordError,
        title: "Mật khẩu chưa hợp lệ",
      });
    }
    if (!method) return;

    setIsSubmitting(true);
    try {
      if (firebaseToken) {
        await resetWithToken(firebaseToken);
        return;
      }

      if (method === "email") {
        await SecureStore.setItemAsync(PENDING_EMAIL_KEY, identifier);
        await sendSignInLinkToEmail(getAuth(), identifier, {
          android: {
            installApp: true,
            packageName: "com.quyentrinh.viora",
          },
          handleCodeInApp: true,
          url: EMAIL_LINK_URL,
        });
        setStep("email-sent");
        return;
      }

      confirmationRef.current = await signInWithPhoneNumber(
        getAuth(),
        phoneNumber,
      );
      setOtp("");
      setStep("otp");
    } catch (error) {
      showAlert({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không thể gửi yêu cầu xác minh.",
        title: "Xác minh thất bại",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmPhoneOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim()) || !confirmationRef.current) {
      return showAlert({
        kind: "error",
        message: "Mã OTP không hợp lệ.",
        title: "Xác minh thất bại",
      });
    }

    setIsSubmitting(true);
    try {
      const credential = await confirmationRef.current.confirm(otp.trim());
      const token = await credential.user.getIdToken(true);
      await resetWithToken(token);
    } catch {
      showAlert({
        kind: "error",
        message: "Mã OTP không hợp lệ hoặc đã hết hạn.",
        title: "Không thể đổi mật khẩu",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = {
    "email-sent": "Kiểm tra email",
    identifier: "Quên mật khẩu",
    otp: "Nhập mã xác minh",
    password: "Tạo mật khẩu mới",
  }[step];

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
        >
          <View style={styles.container}>
            <Pressable
              accessibilityLabel="Quay lại"
              hitSlop={10}
              onPress={() =>
                step === "identifier" ? router.back() : setStep("identifier")
              }
              style={styles.backButton}
            >
              <Ionicons color={colors.text} name="arrow-back" size={24} />
            </Pressable>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {step === "otp"
                  ? `Mã SMS đã được gửi tới ${phoneNumber}.`
                  : step === "email-sent"
                    ? `Link xác minh đã được gửi tới ${identifier}.`
                    : "Xác minh email hoặc số điện thoại của tài khoản."}
              </Text>
            </View>
            <View style={styles.card}>
              {step === "identifier" && (
                <>
                  <AuthField
                    autoCapitalize="none"
                    autoComplete="username"
                    icon="person-outline"
                    keyboardType="default"
                    label="Thông tin đăng nhập"
                    onChangeText={setIdentifier}
                    onSubmitEditing={lookupAccount}
                    placeholder="Email hoặc số điện thoại"
                    returnKeyType="go"
                    value={identifier}
                  />
                  <AuthPrimaryButton
                    isLoading={isSubmitting}
                    label="Tiếp tục"
                    onPress={lookupAccount}
                  />
                </>
              )}
              {step === "password" && (
                <>
                  <AuthField
                    autoCapitalize="none"
                    autoComplete="new-password"
                    icon="lock-closed-outline"
                    label="Mật khẩu mới"
                    onChangeText={setNewPassword}
                    placeholder="••••••••"
                    secure
                    textContentType="newPassword"
                    value={newPassword}
                  />
                  <AuthField
                    autoCapitalize="none"
                    autoComplete="new-password"
                    icon="shield-checkmark-outline"
                    label="Nhập lại mật khẩu"
                    onChangeText={setConfirmPassword}
                    onSubmitEditing={startVerification}
                    placeholder="••••••••"
                    returnKeyType="go"
                    secure
                    textContentType="newPassword"
                    value={confirmPassword}
                  />
                  <Text style={styles.hint}>
                    Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.
                  </Text>
                  <AuthPrimaryButton
                    isLoading={isSubmitting}
                    label={
                      firebaseToken
                        ? "Đổi mật khẩu"
                        : method === "email"
                          ? "Gửi link xác minh"
                          : "Gửi mã OTP"
                    }
                    onPress={startVerification}
                  />
                </>
              )}
              {step === "otp" && (
                <>
                  <AuthField
                    autoComplete="one-time-code"
                    icon="keypad-outline"
                    keyboardType="number-pad"
                    label="Mã OTP"
                    onChangeText={(value) =>
                      setOtp(value.replace(/\D/g, "").slice(0, 6))
                    }
                    onSubmitEditing={confirmPhoneOtp}
                    placeholder="Nhập 6 chữ số"
                    returnKeyType="done"
                    textContentType="oneTimeCode"
                    value={otp}
                  />
                  <AuthPrimaryButton
                    disabled={otp.length !== 6}
                    isLoading={isSubmitting}
                    label="Xác nhận và đổi mật khẩu"
                    onPress={confirmPhoneOtp}
                  />
                </>
              )}
              {step === "email-sent" && (
                <>
                  <View style={styles.mailIcon}>
                    <Ionicons color={colors.primary} name="mail-open-outline" size={42} />
                  </View>
                  <Text style={styles.emailHelp}>
                    Mở email trên thiết bị này và bấm vào link xác minh. Sau khi
                    quay lại ứng dụng, bạn có thể hoàn tất đổi mật khẩu.
                  </Text>
                  <AuthPrimaryButton
                    isLoading={isSubmitting}
                    label="Gửi lại link"
                    onPress={startVerification}
                  />
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AuthAlert alert={alert} onAction={handleAlertAction} onClose={closeAlert} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  container: { gap: spacing.xl, maxWidth: 430, width: "100%" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emailHelp: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  flex: { flex: 1 },
  heading: { alignItems: "center", gap: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  mailIcon: { alignItems: "center", paddingVertical: spacing.sm },
  screen: { backgroundColor: colors.background, flex: 1 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
});
