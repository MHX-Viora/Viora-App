import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PostCard } from "@/components/feed/post-card";
import { ReelsGridViewer } from "@/components/reels/reels-grid-viewer";
import { colors, spacing } from "@/theme";
import type { FeedPost } from "@/types/feed";
import type { Reel } from "@/types/reel";

type ProfileTab = "posts" | "videos";

export function ProfileContent({
  isLoading,
  onCommentReel,
  onCommentPost,
  onDeleteReel,
  onDeletePost,
  onOpenAuthor,
  onReactPost,
  onReactReel,
  onSavePost,
  onSaveReel,
  onSharePost,
  onShareReel,
  posts,
  reelCommentEvent,
  reels,
  reelsPaused,
  stats,
}: {
  isLoading?: boolean;
  onCommentReel?: (reelId: string) => void;
  onCommentPost?: (postId: string) => void;
  onDeleteReel?: (reelId: string) => void;
  onDeletePost?: (postId: string) => void;
  onOpenAuthor?: (userId: string) => void;
  onReactPost?: (postId: string, reactionType: number) => void;
  onReactReel?: (reelId: string) => void;
  onSavePost?: (postId: string) => void;
  onSaveReel?: (reelId: string) => void;
  onSharePost?: (postId: string) => void;
  onShareReel?: (reel: Reel) => void;
  posts: FeedPost[];
  reelCommentEvent?: { id: string; nonce: number } | null;
  reels: Reel[];
  reelsPaused?: boolean;
  stats: readonly { label: string; value: string }[];
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const isPostsTab = activeTab === "posts";
  const emptyText = isPostsTab
    ? "Bài viết của bạn sẽ xuất hiện tại đây"
    : "Video của bạn sẽ xuất hiện tại đây";

  return (
    <>
      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text numberOfLines={1} style={styles.statLabel}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.tabs}>
        <ProfileTabButton
          active={isPostsTab}
          label="Bài viết"
          onPress={() => setActiveTab("posts")}
        />
        <ProfileTabButton
          active={!isPostsTab}
          label="Video"
          onPress={() => setActiveTab("videos")}
        />
      </View>

      {isLoading ? (
        <ProfileContentSkeleton activeTab={activeTab} />
      ) : isPostsTab && posts.length > 0 ? (
        <View style={styles.postsList}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              onComment={onCommentPost}
              onDeleted={onDeletePost}
              onOpenAuthor={onOpenAuthor}
              onReact={onReactPost}
              onSave={onSavePost}
              onShare={onSharePost}
              post={post}
            />
          ))}
        </View>
      ) : !isPostsTab && reels.length > 0 ? (
        <ReelsGridViewer
          onComment={onCommentReel}
          onCommentCreated={reelCommentEvent}
          onDelete={onDeleteReel}
          onOpenAuthor={onOpenAuthor}
          onReact={onReactReel}
          onSave={onSaveReel}
          onShare={onShareReel}
          paused={reelsPaused}
          reels={reels}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            color={colors.textMuted}
            name={isPostsTab ? "images-outline" : "videocam-outline"}
            size={32}
          />
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </>
  );
}

function ProfileContentSkeleton({ activeTab }: { activeTab: ProfileTab }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const isPostsTab = activeTab === "posts";

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 650,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 650,
          toValue: 0.45,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (!isPostsTab) {
    return (
      <View style={styles.videoSkeletonGrid}>
        {Array.from({ length: 9 }).map((_, index) => (
          <Animated.View
            key={index}
            style={[styles.videoSkeletonTile, { opacity }]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.postSkeletonList}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.postSkeletonCard}>
          <View style={styles.postSkeletonHeader}>
            <Animated.View style={[styles.postSkeletonAvatar, { opacity }]} />
            <View style={styles.postSkeletonTextBlock}>
              <Animated.View style={[styles.postSkeletonLineLarge, { opacity }]} />
              <Animated.View style={[styles.postSkeletonLineSmall, { opacity }]} />
            </View>
          </View>
          <Animated.View style={[styles.postSkeletonBody, { opacity }]} />
          <Animated.View style={[styles.postSkeletonBodyShort, { opacity }]} />
          <Animated.View style={[styles.postSkeletonMedia, { opacity }]} />
        </View>
      ))}
    </View>
  );
}

function ProfileTabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.tab}
    >
      <Text style={[styles.tabText, active && styles.activeTabText]}>
        {label}
      </Text>
      {active && <View style={styles.activeIndicator} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    backgroundColor: colors.primary,
    bottom: -1,
    height: 2,
    left: 0,
    position: "absolute",
    right: 0,
  },
  activeTabText: { color: colors.primary, fontWeight: "700" },
  emptyState: { alignItems: "center", gap: spacing.sm, paddingVertical: 48 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  postsList: { backgroundColor: colors.background },
  postSkeletonAvatar: {
    backgroundColor: colors.border,
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  postSkeletonBody: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 12,
    marginTop: spacing.md,
    width: "92%",
  },
  postSkeletonBodyShort: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 12,
    marginTop: spacing.sm,
    width: "64%",
  },
  postSkeletonCard: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: spacing.md,
  },
  postSkeletonHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  postSkeletonLineLarge: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 12,
    width: 140,
  },
  postSkeletonLineSmall: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 10,
    marginTop: spacing.xs,
    width: 84,
  },
  postSkeletonList: { backgroundColor: colors.background },
  postSkeletonMedia: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.border,
    borderRadius: 12,
    marginTop: spacing.md,
    width: "100%",
  },
  postSkeletonTextBlock: { flex: 1 },
  statItem: { alignItems: "center", flex: 1 },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  stats: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginTop: 32,
    paddingVertical: spacing.lg,
  },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "800" },
  tab: {
    alignItems: "center",
    flex: 1,
    paddingVertical: spacing.md,
    position: "relative",
  },
  tabs: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },
  videoSkeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: 2,
  },
  videoSkeletonTile: {
    aspectRatio: 9 / 16,
    backgroundColor: colors.border,
    marginBottom: 2,
    marginRight: 2,
    width: "32.8%",
  },
});
