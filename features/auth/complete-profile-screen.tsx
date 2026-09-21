import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthPrimaryButton } from "@/components/auth/auth-controls";
import { AuthBackground } from "@/components/auth/auth-background";
import { ProfilePhotoPicker } from "@/components/auth/profile-photo-picker";
import { AuthAlert, useAuthAlert } from "@/features/auth/auth-alert";
import { CompleteProfileLogoutDialog } from "@/features/auth/complete-profile-logout-dialog";
import { getStoredAuthSession, logout } from "@/services/auth.service";
import { registerPushNotifications } from "@/services/push-notification.service";
import { startRealtime, stopRealtime } from "@/services/realtime.service";
import { completeProfile } from "@/services/user.service";
import { updateUser } from "@/stores/session-store";
import { spacing } from "@/theme";
import type { Gender, GenderLabel } from "@/types/auth";
import { type AppTheme, useTheme } from "@/theme";


const GENDERS: GenderLabel[] = ["Nam", "Nữ", "Khác"];

export function CompleteProfileScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { alert, closeAlert, handleAlertAction, showAlert } = useAuthAlert();
  const [avatarUri, setAvatarUri] = useState<string>();
  const [coverUri, setCoverUri] = useState<string>();
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<GenderLabel>();
  const [isLogoutDialogVisible, setIsLogoutDialogVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoggingOutRef = useRef(false);

  const handleLogout = async () => {
    if (isLoggingOutRef.current) return;

    isLoggingOutRef.current = true;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Local và provider state vẫn được dọn trong finally của logout().
    } finally {
      await stopRealtime().catch(() => undefined);
      setIsLogoutDialogVisible(false);
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace("/login");
    }
  };

  const handleCreateProfile = async () => {
    const normalizedName = displayName.trim();
    if (!normalizedName || !gender) {
      return showAlert({
        title: "Thiếu thông tin",
        message: "Nhập tên hiển thị và chọn giới tính.",
      });
    }

    setIsSubmitting(true);
    try {
      const session = await getStoredAuthSession();
      if (!session?.accessToken) {
        showAlert({
          title: "Phiên đã hết",
          message: "Vui lòng đăng nhập lại.",
          kind: "error",
        });
        return;
      }

      // Backend: Unknown = 0, Male = 1, Female = 2.
      const genderValue: Gender = gender === "Nam" ? 1 : gender === "Nữ" ? 2 : 0;

      const user = await completeProfile({
        avatarUrl: avatarUri,
        coverUrl: coverUri,
        displayName: normalizedName,
        gender: genderValue,
      });

      // Lưu UserResponse từ backend vào phiên hiện tại.
      await updateUser(user);
      void startRealtime();
      void registerPushNotifications();
      router.replace("/");
    } catch (error) {
      showAlert({
        title: "Không thể lưu hồ sơ",
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
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Hoàn thiện hồ sơ
        </Text>
        <Pressable
          accessibilityLabel="Thoát khỏi tài khoản"
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoggingOut || isSubmitting }}
          disabled={isLoggingOut || isSubmitting}
          onPress={() => setIsLogoutDialogVisible(true)}
          style={({ pressed }) => [
            styles.exitButton,
            pressed && styles.exitButtonPressed,
          ]}
        >
          <Ionicons color={colors.textMuted} name="log-out-outline" size={18} />
          <Text style={styles.exitLabel}>Thoát</Text>
        </Pressable>
      </View>
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
              <Text style={styles.subtitle}>
                Hãy cho mọi người biết thêm về bạn để bắt đầu kết nối.
              </Text>
            </View>

            <ProfilePhotoPicker
              avatarUri={avatarUri}
              coverUri={coverUri}
              onAvatarChange={setAvatarUri}
              onCoverChange={setCoverUri}
            />

            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Tên hiển thị</Text>
                <View style={styles.nameField}>
                  <TextInput
                    accessibilityLabel="Tên hiển thị"
                    autoCapitalize="words"
                    onChangeText={setDisplayName}
                    placeholder="Nhập tên của bạn"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    value={displayName}
                  />
                  <Ionicons
                    color={colors.textMuted}
                    name="id-card-outline"
                    size={21}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Giới tính</Text>
                <View style={styles.genderRow}>
                  {GENDERS.map((item) => {
                    const selected = gender === item;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        key={item}
                        onPress={() => setGender(item)}
                        style={[
                          styles.genderButton,
                          selected && styles.genderSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            selected && styles.genderTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <AuthPrimaryButton
                isLoading={isSubmitting}
                label="Bắt đầu ngay"
                onPress={handleCreateProfile}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AuthAlert
        alert={alert}
        onAction={handleAlertAction}
        onClose={closeAlert}
      />
      <CompleteProfileLogoutDialog
        isLoading={isLoggingOut}
        onCancel={() => setIsLogoutDialogVisible(false)}
        onConfirm={() => void handleLogout()}
        visible={isLogoutDialogVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => {
  const { colors, effects } = theme;

  return StyleSheet.create({
  container: { gap: spacing.xl, maxWidth: 430, width: "100%" },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  fieldGroup: { gap: spacing.sm },
  flex: { flex: 1 },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: Math.min(effects.cardRadius, 18),
    borderWidth: 1,
    gap: spacing.xl,
    padding: spacing.xl,
    ...effects.shadow,
  },
  genderButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  genderRow: { flexDirection: "row", gap: spacing.sm },
  genderSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  genderText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  genderTextSelected: { color: colors.primary },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  headerSide: { width: 76 },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  heading: { alignItems: "center", gap: spacing.xs },
  exitButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 40,
    width: 76,
  },
  exitButtonPressed: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    transform: [{ scale: 0.98 }],
  },
  exitLabel: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  input: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 12 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700" },
  nameField: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    maxWidth: 300,
    textAlign: "center",
  },
  });
};
