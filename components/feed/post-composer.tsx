import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ViewableImage } from "@/components/common/viewable-image";
import { FixedTopBar } from "@/components/layout/fixed-top-bar";
import { communityColors as colors } from "@/features/feed/community-colors";
import { spacing } from "@/theme";

export function PostComposer({ avatar, onCreatePress, onImagePress, onSearchPress }: { avatar: string; onCreatePress: () => void; onImagePress: () => void; onSearchPress: () => void }) {
  return (
    <FixedTopBar>
      <View style={styles.container}>
        <ViewableImage
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
        <Pressable
          accessibilityLabel="Tìm kiếm bài viết"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onSearchPress}
        >
          <Ionicons color={colors.text} name="search-outline" size={24} />
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 8,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: colors.glow,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
  prompt: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  promptText: { color: colors.textMuted, fontSize: 15 },
});
