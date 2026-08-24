import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UserAvatar } from "@/components/common/user-avatar";
import { FixedTopBar } from "@/components/layout/fixed-top-bar";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function PostComposer({ avatar, canCreateArticle, displayName, onArticlePress, onCreatePress, onImagePress, onSearchPress }: { avatar: string; canCreateArticle: boolean; displayName: string; onArticlePress: () => void; onCreatePress: () => void; onImagePress: () => void; onSearchPress: () => void }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <FixedTopBar>
      <View style={styles.container}>
        <UserAvatar
          displayName={displayName}
          imageUrl={avatar}
          size={36}
          style={styles.avatar}
        />
        {canCreateArticle ? <Pressable
          accessibilityLabel="Tạo bài viết dài"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onArticlePress}
        >
          <Ionicons color={colors.primary} name="document-text-outline" size={23} />
        </Pressable> : null}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
