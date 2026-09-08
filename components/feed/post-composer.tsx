import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UserAvatar } from "@/components/common/user-avatar";
import { ArticleSortTabs } from "@/components/feed/article-sort-tabs";
import {
  FeedCategoryHeader,
  type FeedCategory,
} from "@/components/feed/feed-category-header";
import { FixedTopBar } from "@/components/layout/fixed-top-bar";
import { DesktopDownloadPromo } from "@/components/landing/desktop-download-promo";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";
import type { PostFeedSort } from "@/types/feed";


export function PostComposer({
  activeCategory,
  articleSort,
  avatar,
  canCreateArticle,
  displayName,
  onArticlePress,
  onArticleSortChange,
  onArticlesFeedPress,
  onCommunityPress,
  onCreatePress,
  onImagePress,
  onReelsPress,
  onSearchPress,
}: {
  activeCategory: FeedCategory;
  articleSort: PostFeedSort;
  avatar: string;
  canCreateArticle: boolean;
  displayName: string;
  onArticlePress: () => void;
  onArticleSortChange: (sort: PostFeedSort) => void;
  onArticlesFeedPress: () => void;
  onCommunityPress: () => void;
  onCreatePress: () => void;
  onImagePress: () => void;
  onReelsPress: () => void;
  onSearchPress: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <FixedTopBar isArticle={activeCategory === "articles"}>
      <View style={styles.topBarContent}>
        <FeedCategoryHeader
          activeCategory={activeCategory}
          onArticlesPress={onArticlesFeedPress}
          onCommunityPress={onCommunityPress}
          onReelsPress={onReelsPress}
        />
        <DesktopDownloadPromo />
        {activeCategory === "articles" ? (
          <View style={[styles.container, styles.articleContainer]}>
            <View style={styles.articlePrimaryRow}>
              <Pressable
                accessibilityLabel="Tìm kiếm bài báo"
                accessibilityRole="button"
                onPress={onSearchPress}
                style={({ pressed }) => [
                  styles.articleSearchButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons color={colors.textMuted} name="search-outline" size={22} />
                <Text numberOfLines={1} style={styles.articleSearchText}>
                  Tìm bài báo, chủ đề, tác giả...
                </Text>
              </Pressable>
              {canCreateArticle ? (
                <Pressable
                  accessibilityLabel="Tạo bài báo"
                  accessibilityRole="button"
                  onPress={onArticlePress}
                  style={({ pressed }) => [
                    styles.articlePublishButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons
                    color={colors.primaryContrast}
                    name="create-outline"
                    size={21}
                  />
                  <Text numberOfLines={1} style={styles.articlePublishText}>
                    Tạo bài báo
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <ArticleSortTabs onChange={onArticleSortChange} value={articleSort} />
          </View>
        ) : (
          <View style={styles.container}>
            <UserAvatar
              displayName={displayName}
              imageUrl={avatar}
              size={36}
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
        )}
      </View>
    </FixedTopBar>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  articleContainer: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  articlePrimaryRow: { flexDirection: "row", gap: spacing.sm },
  articlePublishButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  articlePublishText: {
    color: colors.primaryContrast,
    fontSize: 14,
    fontWeight: "800",
  },
  articleSearchButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  articleSearchText: { color: colors.textMuted, flex: 1, fontSize: 14 },
  avatar: { borderRadius: 18, height: 36, width: 36 },
  buttonPressed: { opacity: 0.68 },
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
  topBarContent: { gap: spacing.sm },
});
