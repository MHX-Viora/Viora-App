import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FixedTopBar } from "@/components/layout/fixed-top-bar";
import { colors, spacing } from "@/theme";

export function PostComposer({ avatar, onCreatePress, onImagePress }: { avatar: string; onCreatePress: () => void; onImagePress: () => void }) {
  return (
    <FixedTopBar>
      <View style={styles.container}>
        <Image
          accessibilityLabel="Ảnh đại diện của bạn"
          source={avatar}
          style={styles.avatar}
        />
        <Pressable
          accessibilityLabel="Tạo bài viết mới"
          accessibilityRole="button"
          onPress={onCreatePress}
          style={styles.prompt}
        >
          <Text style={styles.promptText}>Bạn đang nghĩ gì?</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Thêm ảnh"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onImagePress}
        >
          <Ionicons color={colors.primary} name="images-outline" size={23} />
        </Pressable>
      </View>
    </FixedTopBar>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 18, height: 36, width: 36 },
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  prompt: {
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  promptText: { color: colors.textMuted, fontSize: 15 },
});
