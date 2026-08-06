import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CommentsModal } from "@/components/comments/comments-modal";
import { PostCard } from "@/components/feed/post-card";
import { openProfileByUserId } from "@/features/profile/open-profile";
import { getPostById } from "@/services/feed.service";
import { reactPost, savePost } from "@/services/post.service";
import { getPostShareLink } from "@/services/share-link.service";
import { spacing } from "@/theme";
import type { FeedPost } from "@/types/feed";
import { type ThemeColors, useTheme } from "@/theme";


const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export function PostPreviewScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const postId = useMemo(() => firstParam(params.postId).trim(), [params.postId]);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    try {
      setPost(await getPostById(postId));
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Khong the tai bai viet.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReact = useCallback(async (id: string, reactionType: number) => {
    const result = await reactPost(id, reactionType);
    setPost((current) =>
      current?.id === id
        ? {
            ...current,
            isReacted: result.isReacted,
            reactionType: result.reactionType,
            reactions: result.reactionCount,
          }
        : current,
    );
  }, []);

  const handleSave = useCallback(async (id: string) => {
    const result = await savePost(id);
    setPost((current) =>
      current?.id === id
        ? { ...current, isSaved: result.isSaved, saveCount: result.saveCount }
        : current,
    );
  }, []);

  const handleShare = useCallback(async (id: string) => {
    const link = await getPostShareLink(id);
    await Share.share({
      title: "ANKT",
      message: `Xem bài viết này trên ANKT\n${link.shareUrl}`,
      url: link.shareUrl,
    });
  }, []);

  const handleCommentCreated = useCallback((id: string) => {
    setPost((current) =>
      current?.id === id ? { ...current, comments: current.comments + 1 } : current,
    );
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setPost((current) => (current?.id === id ? null : current));
    router.back();
  }, []);

  const openUserProfile = useCallback((userId: string) => {
    void openProfileByUserId(router, userId);
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" style={styles.cyanGlow} />
      <View pointerEvents="none" style={styles.purpleGlow} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Chi tiết bài viết</Text>
          <Text style={styles.headerSubtitle}>Cộng đồng ANKT</Text>
        </View>
        <View style={styles.headerBalance} />
      </View>
      <View style={styles.headerGlow} />

      {isLoading ? (
        <View style={styles.center}>
          <View style={styles.loadingFrame}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
          <Text style={styles.loadingText}>Đang tải bài viết...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons color={colors.danger} name="cloud-offline-outline" size={30} />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : post ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PostCard
            onComment={setCommentsPostId}
            onDeleted={handleDeleted}
            onOpenAuthor={openUserProfile}
            onReact={handleReact}
            onSave={handleSave}
            onShare={handleShare}
            post={post}
          />
        </ScrollView>
      ) : null}
      <CommentsModal
        onClose={() => setCommentsPostId(null)}
        onCommentCreated={handleCommentCreated}
        postId={commentsPostId}
        visible={commentsPostId !== null}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.lg,
  },
  cyanGlow: {
    backgroundColor: colors.visuals.rgb_36_221_228_0_09,
    borderRadius: 150,
    height: 260,
    position: "absolute",
    right: -120,
    top: 20,
    width: 260,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorIcon: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_255_84_112_0_12,
    borderColor: colors.visuals.rgb_255_84_112_0_42,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  errorText: {
    color: colors.textMuted,
    lineHeight: 21,
    maxWidth: 300,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_10_24_42_0_76,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 2,
  },
  headerGlow: {
    backgroundColor: colors.primary,
    height: 1,
    opacity: 0.55,
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  headerBalance: { width: 40 },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  headerText: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  iconButtonPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  loadingFrame: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    width: 64,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  purpleGlow: {
    backgroundColor: colors.visuals.rgb_152_80_232_0_08,
    borderRadius: 160,
    bottom: -100,
    height: 300,
    left: -150,
    position: "absolute",
    width: 300,
  },
  retryButton: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryButtonPressed: { opacity: 0.72 },
  retryText: { color: colors.primary, fontWeight: "800" },
  screen: { backgroundColor: colors.background, flex: 1 },
});
