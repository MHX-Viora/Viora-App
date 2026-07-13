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
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthPrimaryButton } from "@/components/auth/auth-controls";
import { ProfilePhotoPicker } from "@/components/auth/profile-photo-picker";
import { colors, spacing } from "@/theme";
import { createProfile } from "@/services/user.service";
import { sessionStore } from "@/stores/session-store";
import { AuthAlert, useAuthAlert } from "@/features/auth/auth-alert";
import type { Gender, GenderLabel } from "@/types/auth";

const GENDERS: GenderLabel[] = ["Nam", "Nữ", "Khác"];

export function CompleteProfileScreen() {
  const { alert, closeAlert, handleAlertAction, showAlert } = useAuthAlert();
  const [avatarUri, setAvatarUri] = useState<string>();
  const [coverUri, setCoverUri] = useState<string>();
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<GenderLabel>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProfile = async () => {
    const normalizedName = displayName.trim();
    if (!avatarUri || !coverUri || !normalizedName || !gender) {
      return showAlert({
        title: "Thiếu thông tin",
        message: "Chọn ảnh bìa, ảnh đại diện, nhập tên và giới tính.",
      });
    }

    setIsSubmitting(true);
    try {
      // Lấy access token đã lưu sau bước đăng nhập.
      const session = await sessionStore.getSession();
      if (!session) {
        showAlert({
          title: "Phiên đã hết",
          message: "Vui lòng đăng nhập lại.",
          kind: "error",
        });
        return;
      }

      // Backend nhận giới tính dưới dạng số: Nam = 0, Nữ = 1, Khác = 2.
      const genderValue = GENDERS.indexOf(gender) as Gender;

      // Gọi API tạo hồ sơ và gửi token trong Authorization header.
      const user = await createProfile(session.accessToken, {
        avatarUrl: avatarUri,
        coverUrl: coverUri,
        displayName: normalizedName,
        gender: genderValue,
      });

      // Thay user null trong phiên bằng user backend vừa trả về.
      await sessionStore.updateUser(user);
      showAlert({
        title: "Hoàn tất hồ sơ",
        message: "Hồ sơ của bạn đã được lưu.",
        kind: "success",
        actionLabel: "Tiếp tục",
        onAction: () => router.replace("/"),
      });
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
                Hoàn thiện hồ sơ
              </Text>
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
                  <Ionicons color={colors.textMuted} name="id-card-outline" size={21} />
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
                        style={[styles.genderButton, selected && styles.genderSelected]}
                      >
                        <Text style={[styles.genderText, selected && styles.genderTextSelected]}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <AuthPrimaryButton
              isLoading={isSubmitting}
              label="Bắt đầu ngay"
              onPress={handleCreateProfile}
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
  container: { gap: spacing.xl, maxWidth: 430, width: "100%" },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.md },
  fieldGroup: { gap: spacing.sm },
  flex: { flex: 1 },
  formCard: {
    backgroundColor: colors.surface, borderRadius: 20, gap: spacing.xl,
    padding: spacing.xl, shadowColor: "#7D8799", shadowOpacity: 0.08, shadowRadius: 14,
  },
  genderButton: {
    alignItems: "center", backgroundColor: colors.background, borderColor: colors.border,
    borderRadius: 10, borderWidth: 1, flex: 1, minHeight: 46, justifyContent: "center",
  },
  genderRow: { flexDirection: "row", gap: spacing.sm },
  genderSelected: { backgroundColor: "#E0EBFF", borderColor: colors.primary },
  genderText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  genderTextSelected: { color: "#1239A6" },
  heading: { alignItems: "center", gap: spacing.xs },
  input: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 12 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700" },
  nameField: {
    alignItems: "center", backgroundColor: colors.background, borderRadius: 10,
    flexDirection: "row", minHeight: 48, paddingHorizontal: spacing.md,
  },
  screen: { backgroundColor: "#F5F7FD", flex: 1 },
  subtitle: { color: colors.textMuted, fontSize: 14, maxWidth: 300, textAlign: "center" },
  title: { color: "#071A38", fontSize: 26, fontWeight: "900" },
});
