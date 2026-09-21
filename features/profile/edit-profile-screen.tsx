import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import {
  Alert,
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
import { showAppToast } from "@/components/common/app-toast";
import { ViewableImage } from "@/components/common/viewable-image";
import { UserAvatar } from "@/components/common/user-avatar";
import { AuthAlert, useAuthAlert } from "@/features/auth/auth-alert";
import { updateProfile } from "@/services/user.service";
import { getSession, updateUser } from "@/stores/session-store";
import { spacing } from "@/theme";
import type { Gender, GenderLabel, User } from "@/types/auth";
import { type ThemeColors, useTheme } from "@/theme";


const GENDERS: { label: GenderLabel; value: Gender }[] = [
  { label: "Nam", value: 1 },
  { label: "Nữ", value: 2 },
  { label: "Khác", value: 0 },
];

export function EditProfileScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { alert, closeAlert, handleAlertAction, showAlert } = useAuthAlert();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<Gender>(0);
  const [avatarUri, setAvatarUri] = useState<string>();
  const [coverUri, setCoverUri] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const session = await getSession();

      if (!session?.accessToken) {
        router.replace("/login");
        return;
      }

      if (session.user === null) {
        router.replace("/complete-profile");
        return;
      }

      setUser(session.user);
      setDisplayName(session.user.displayName);
      setGender(session.user.gender ?? 0);
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  const pickImage = async (onSelected: (uri: string) => void) => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập",
          "Hãy cho phép ANKT truy cập thư viện để chọn ảnh hồ sơ.",
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      onSelected(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    const normalizedName = displayName.trim();

    if (!normalizedName) {
      showAlert({
        title: "Thiếu tên hiển thị",
        message: "Vui lòng nhập tên hiển thị.",
        kind: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUser = await updateProfile({
        avatarUrl: avatarUri,
        coverUrl: coverUri,
        displayName: normalizedName,
        gender,
      });

      await updateUser(updatedUser);
      showAppToast({
        message: "Hồ sơ của bạn đã được cập nhật.",
        title: "Cập nhật thành công",
        type: "success",
      });
      router.replace("/profile");
    } catch (error) {
      showAlert({
        title: "Không thể cập nhật hồ sơ",
        message: error instanceof Error ? error.message : "Vui lòng thử lại.",
        kind: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || user === null) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  const previewAvatar = avatarUri ?? user.avatarUrl;
  const previewCover = coverUri ?? user.coverUrl;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons color={colors.text} name="chevron-back" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Cập nhật hồ sơ</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.coverBox}>
            <ViewableImage
              accessibilityLabel="Ảnh bìa hồ sơ"
              contentFit="cover"
              source={previewCover}
              style={styles.cover}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => pickImage(setCoverUri)}
              style={styles.coverButton}
            >
              <Ionicons color={colors.white} name="camera" size={15} />
              <Text style={styles.imageButtonText}>Đổi ảnh bìa</Text>
            </Pressable>
          </View>

          <View style={styles.avatarRow}>
            <UserAvatar
              displayName={displayName || user.displayName}
              imageUrl={previewAvatar}
              size={90}
              style={styles.avatar}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => pickImage(setAvatarUri)}
              style={styles.secondaryButton}
            >
              <Ionicons color={colors.primary} name="camera-outline" size={18} />
              <Text style={styles.secondaryButtonText}>Đổi ảnh đại diện</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tên hiển thị</Text>
              <TextInput
                accessibilityLabel="Tên hiển thị"
                autoCapitalize="words"
                onChangeText={setDisplayName}
                placeholder="Nhập tên hiển thị"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={displayName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((item) => {
                  const selected = gender === item.value;

                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      key={item.value}
                      onPress={() => setGender(item.value)}
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
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <AuthPrimaryButton
              isLoading={isSubmitting}
              label="Lưu thay đổi"
              onPress={handleUpdateProfile}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: {
    borderColor: colors.surface,
    borderRadius: 45,
    borderWidth: 4,
    height: 90,
    width: 90,
  },
  avatarRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginTop: -34,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  content: { paddingBottom: spacing.xl },
  cover: { height: 180, width: "100%" },
  coverBox: { position: "relative" },
  coverButton: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_15_23_42_0_74,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
  },
  fieldGroup: { gap: spacing.sm },
  flex: { flex: 1 },
  form: { gap: spacing.lg, padding: spacing.lg },
  genderButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  genderRow: { flexDirection: "row", gap: spacing.sm },
  genderSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  genderText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  genderTextSelected: { color: colors.primary },
  header: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_10_23_41_0_94,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 54,
    paddingHorizontal: spacing.sm,
  },
  headerSpacer: { width: 40 },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  imageButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  label: { color: colors.text, fontSize: 13, fontWeight: "700" },
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  screen: { backgroundColor: colors.background, flex: 1 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
