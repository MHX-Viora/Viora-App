import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CommentsModal } from "@/components/comments/comments-modal";
import { PostCard } from "@/components/feed/post-card";
import { ReelsGridViewer } from "@/components/reels/reels-grid-viewer";
import { openProfileByUserId } from "@/features/profile/open-profile";
import { useProfileActivityList } from "@/hooks/use-profile-activity-list";
import {
  getProfileActivityPosts,
  getProfileActivityReels,
} from "@/services/profile-activity.service";
import { reactPost, savePost } from "@/services/post.service";
import { getPostShareLink, getReelShareLink } from "@/services/share-link.service";
import { communityColors as colors } from "@/features/feed/community-colors";
import { spacing } from "@/theme";
import type { FeedPost } from "@/types/feed";
import type { ProfileActivityContentType, ProfileActivityKind } from "@/types/profile-activity";
import type { Reel } from "@/types/reel";
import { Share } from "react-native";

type ActivityList = ReturnType<typeof useProfileActivityList<FeedPost>>;
type ReelActivityList = ReturnType<typeof useProfileActivityList<Reel>>;

function SegmentButton<T extends string>({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  value: T;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActivitySkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonLines}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  contentType,
  kind,
}: {
  contentType: ProfileActivityContentType;
  kind: ProfileActivityKind;
}) {
  const isPosts = contentType === "posts";
  const message =
    kind === "reacted"
      ? isPosts
        ? "Bạn chưa thả cảm xúc bài viết nào."
        : "Bạn chưa thả cảm xúc video nào."
      : isPosts
        ? "Bạn chưa lưu bài viết nào."
        : "Bạn chưa lưu video nào.";

  return (
    <View style={styles.emptyState}>
      <Ionicons
        color={colors.textMuted}
        name={isPosts ? "heart-outline" : "play-circle-outline"}
        size={34}
      />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Thử lại</Text>
      </Pressable>
    </View>
  );
}

export function ProfileActivityScreen() {
  const params = useLocalSearchParams<{ kind?: string | string[] }>();
  const initialKind: ProfileActivityKind =
    (Array.isArray(params.kind) ? params.kind[0] : params.kind) === "saved"
      ? "saved"
      : "reacted";
  const kind: ProfileActivityKind = initialKind;
  const [contentType, setContentType] =
    useState<ProfileActivityContentType>("posts");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const reactedPosts = useProfileActivityList<FeedPost>(
    useCallback(
      (params) => getProfileActivityPosts({ ...params, key: "reacted-posts" }),
      [],
    ),
  );
  const reactedReels = useProfileActivityList<Reel>(
    useCallback(
      (params) => getProfileActivityReels({ ...params, key: "reacted-reels" }),
      [],
    ),
  );
  const savedPosts = useProfileActivityList<FeedPost>(
    useCallback(
      (params) => getProfileActivityPosts({ ...params, key: "saved-posts" }),
      [],
    ),
  );
  const savedReels = useProfileActivityList<Reel>(
    useCallback(
      (params) => getProfileActivityReels({ ...params, key: "saved-reels" }),
      [],
    ),
  );

  const activeList = useMemo(() => {
    if (kind === "reacted" && contentType === "posts") return reactedPosts;
    if (kind === "reacted" && contentType === "reels") return reactedReels;
    if (kind === "saved" && contentType === "posts") return savedPosts;
    return savedReels;
  }, [contentType, kind, reactedPosts, reactedReels, savedPosts, savedReels]);
  const activeListRef = useRef(activeList);

  useEffect(() => {
    activeListRef.current = activeList;
  }, [activeList]);

  useEffect(() => {
    activeListRef.current.ensureLoaded();
  }, [contentType, kind]);

  useFocusEffect(
    useCallback(() => {
      const focusedList = activeListRef.current;
      if (focusedList.hasLoaded) void focusedList.refresh();
    }, []),
  );

  const openPost = useCallback((postId: string) => {
    router.push({ pathname: "/post/[postId]", params: { postId } });
  }, []);

  const openUserProfile = useCallback((userId: string) => {
    void openProfileByUserId(router, userId);
  }, []);

  const openReel = useCallback((reelId: string) => {
    router.push({ pathname: "/reel/[reelId]", params: { reelId } });
  }, []);

  const handleReactPost = useCallback(
    async (postId: string, reactionType: number) => {
      const result = await reactPost(postId, reactionType);
      if (!result.isReacted && kind === "reacted") reactedPosts.removeItem(postId);
      if (result.isReacted) {
        const patch = {
          isReacted: result.isReacted,
          reactionType: result.reactionType,
          reactions: result.reactionCount,
        };
        reactedPosts.updateItem(postId, patch);
        savedPosts.updateItem(postId, patch);
      }
    },
    [kind, reactedPosts, savedPosts],
  );

  const handleSavePost = useCallback(
    async (postId: string) => {
      const result = await savePost(postId);
      if (!result.isSaved && kind === "saved") savedPosts.removeItem(postId);
      const patch = {
        isSaved: result.isSaved,
        saveCount: result.saveCount,
      };
      reactedPosts.updateItem(postId, patch);
      if (result.isSaved) savedPosts.updateItem(postId, patch);
    },
    [kind, reactedPosts, savedPosts],
  );

  const handleCommentCreated = useCallback(
    (postId: string) => {
      reactedPosts.updateItem(postId, (post) => ({
        ...post,
        comments: post.comments + 1,
      }));
      savedPosts.updateItem(postId, (post) => ({
        ...post,
        comments: post.comments + 1,
      }));
    },
    [reactedPosts, savedPosts],
  );

  const handleSharePost = useCallback(async (postId: string) => {
    const link = await getPostShareLink(postId);
    await Share.share({
      message: `Xem bài viết này trên Viora\n${link.shareUrl}`,
      url: link.shareUrl,
    });
  }, []);

  const handleShareReel = useCallback(async (reel: Reel) => {
    const link = await getReelShareLink(reel.id);
    await Share.share({
      message: `Xem reels này trên Viora\n${link.shareUrl}`,
      url: link.shareUrl,
    });
  }, []);

  const isPosts = contentType === "posts";
  const list = activeList as ActivityList | ReelActivityList;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {kind === "saved" ? "Đã lưu" : "Yêu thích"}
        </Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.contentSegments}>
        <SegmentButton
          active={contentType === "posts"}
          label="Bài viết"
          onPress={() => setContentType("posts")}
          value="posts"
        />
        <SegmentButton
          active={contentType === "reels"}
          label="Video"
          onPress={() => setContentType("reels")}
          value="reels"
        />
      </View>

      {list.isLoading ? (
        <ActivitySkeleton />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={() => void list.load(1)} />
      ) : isPosts ? (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            (list.items as FeedPost[]).length === 0 && styles.emptyList,
          ]}
          data={list.items as FeedPost[]}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState contentType={contentType} kind={kind} />}
          ListFooterComponent={
            list.isLoadingMore ? <ActivityIndicator color={colors.primary} /> : null
          }
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              onRefresh={() => void list.refresh()}
              refreshing={list.isRefreshing}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <PostCard
              onComment={setCommentsPostId}
              onOpenAuthor={openUserProfile}
              onOpenPost={openPost}
              onReact={handleReactPost}
              onSave={handleSavePost}
              onShare={handleSharePost}
              post={item}
            />
          )}
        />
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.reelsContent,
            (list.items as Reel[]).length === 0 && styles.emptyList,
          ]}
          data={[0]}
          keyExtractor={(item) => String(item)}
          ListFooterComponent={
            list.isLoadingMore ? <ActivityIndicator color={colors.primary} /> : null
          }
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              onRefresh={() => void list.refresh()}
              refreshing={list.isRefreshing}
              tintColor={colors.primary}
            />
          }
          renderItem={() =>
            (list.items as Reel[]).length > 0 ? (
              <ReelsGridViewer
                onOpenReel={openReel}
                onShare={handleShareReel}
                reels={list.items as Reel[]}
              />
            ) : (
              <EmptyState contentType={contentType} kind={kind} />
            )
          }
        />
      )}
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

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  contentSegments: {
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  emptyList: { flexGrow: 1 },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 260,
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  errorText: { color: colors.textMuted, textAlign: "center" },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
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
  listContent: { paddingVertical: spacing.md },
  reelsContent: { flexGrow: 1 },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.primaryContrast, fontWeight: "700" },
  screen: { backgroundColor: colors.background, flex: 1 },
  segmentButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    minHeight: 38,
    justifyContent: "center",
  },
  segmentButtonActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 14, fontWeight: "800" },
  segmentTextActive: { color: colors.primaryContrast },
  skeletonAvatar: {
    backgroundColor: colors.border,
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  skeletonLine: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 16,
    width: "70%",
  },
  skeletonLineShort: { width: "42%" },
  skeletonLines: { flex: 1, gap: spacing.sm },
  skeletonWrap: { gap: spacing.md, padding: spacing.md },
  tabs: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
});
