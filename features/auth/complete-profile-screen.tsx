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

const GENDERS = ["Nam", "Nữ", "Khác"] as const;
type Gender = (typeof GENDERS)[number];

export function CompleteProfileScreen() {
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<Gender>();

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

            <ProfilePhotoPicker />

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
              label="Bắt đầu ngay"
              onPress={() => router.replace("/")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
