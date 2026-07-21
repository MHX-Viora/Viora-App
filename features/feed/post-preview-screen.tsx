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
import { colors, spacing } from "@/theme";
import type { FeedPost } from "@/types/feed";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export function PostPreviewScreen() {
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
      title: "Viora",
      message: `Xem bài viết này trên Viora\n${link.shareUrl}`,
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Bài viết</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryButton}>
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

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
  },
  errorText: { color: colors.textMuted, textAlign: "center" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.white, fontWeight: "700" },
  screen: { backgroundColor: colors.background, flex: 1 },
});
