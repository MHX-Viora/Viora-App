import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { CommentsModal } from "@/components/comments/comments-modal";
import { ResponsiveContent } from "@/components/layout/responsive-content";
import { getReelContentWidth } from "@/components/layout/responsive-layout";
import { ReelCard } from "@/components/reels/reel-card";
import { openProfileByUserId } from "@/features/profile/open-profile";
import { formatReelCount, getReelById } from "@/services/reel.service";
import { reactPost, savePost } from "@/services/post.service";
import { getReelShareLink } from "@/services/share-link.service";
import { layout, spacing } from "@/theme";
import type { Reel } from "@/types/reel";
import { type ThemeColors, useTheme } from "@/theme";


const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export function ReelPreviewScreen() {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ reelId?: string | string[] }>();
  const reelId = useMemo(() => firstParam(params.reelId).trim(), [params.reelId]);
  const [reel, setReel] = useState<Reel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reelHeight, setReelHeight] = useState(0);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setReelHeight((current) => (current === nextHeight ? current : nextHeight));
  }, []);

  const load = useCallback(async () => {
    if (!reelId) return;
    setIsLoading(true);
    try {
      setReel(await getReelById(reelId));
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Khong the tai reels.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [reelId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleShare = useCallback(async (item: Reel) => {
    const link = await getReelShareLink(item.id);
    await Share.share({
      title: "ANKT",
      message: `Xem reels này trên ANKT\n${link.shareUrl}`,
      url: link.shareUrl,
    });
  }, []);

  const handleReact = useCallback(async (id: string) => {
    try {
      const result = await reactPost(id, 1);
      setReel((current) =>
        current?.id === id
          ? {
              ...current,
              isReacted: result.isReacted,
              likes: formatReelCount(result.reactionCount),
              reactionCount: result.reactionCount,
              reactionType: result.reactionType,
            }
          : current,
      );
    } catch (reactError) {
      Alert.alert(
        "Không thể thả tim reels",
        reactError instanceof Error ? reactError.message : "Vui lòng thử lại.",
      );
    }
  }, []);

  const handleSave = useCallback(async (id: string) => {
    try {
      const result = await savePost(id);
      setReel((current) =>
        current?.id === id
          ? { ...current, isSaved: result.isSaved, saveCount: result.saveCount }
          : current,
      );
    } catch (saveError) {
      Alert.alert(
        "Không thể lưu reels",
        saveError instanceof Error ? saveError.message : "Vui lòng thử lại.",
      );
    }
  }, []);

  const handleCommentCreated = useCallback((id: string) => {
    setReel((current) => {
      if (!current || current.id !== id) return current;
      const nextCommentCount =
        Number.parseInt(current.comments.replace(/\D/g, ""), 10) + 1;
      return {
        ...current,
        comments: Number.isFinite(nextCommentCount)
          ? String(nextCommentCount)
          : current.comments,
      };
    });
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setReel((current) => (current?.id === id ? null : current));
    router.back();
  }, []);

  const openUserProfile = useCallback((userId: string) => {
    void openProfileByUserId(router, userId);
  }, []);

  const reelContentWidth = getReelContentWidth({
    height: reelHeight,
    maxWidth: layout.reelsMaxWidth,
  });

  return (
    <SafeAreaView edges={[]} style={styles.screen}>
      <ResponsiveContent maxWidth={reelContentWidth}>
        <View onLayout={handleLayout} style={styles.content}>
          <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
            <Pressable onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons color={colors.white} name="chevron-back" size={24} />
            </Pressable>
            <Text style={styles.headerTitle}>Reels</Text>
            <View style={styles.iconButton} />
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => void load()} style={styles.retryButton}>
                <Text style={styles.retryText}>Thu lai</Text>
              </Pressable>
            </View>
          ) : reel && reelHeight > 0 ? (
            <ReelCard
              active
              height={reelHeight}
              onComment={setCommentsPostId}
              onDelete={handleDeleted}
              onOpenAuthor={openUserProfile}
              onReact={handleReact}
              onSave={handleSave}
              onShare={handleShare}
              reel={reel}
              safeBottomInset={insets.bottom + spacing.xl}
              videoTopOffset={0}
            />
          ) : null}
        </View>
      </ResponsiveContent>
      <CommentsModal
        onClose={() => setCommentsPostId(null)}
        onCommentCreated={handleCommentCreated}
        onOpenUser={openUserProfile}
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
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: { backgroundColor: colors.reelBackground, flex: 1, overflow: "hidden" },
  errorText: { color: colors.white, textAlign: "center" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: "800" },
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
  screen: { backgroundColor: colors.reelBackground, flex: 1 },
});
