import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CommentsModal } from "@/components/comments/comments-modal";
import { ProfileContent } from "@/components/profile/profile-content";
import { ProfileOverview } from "@/components/profile/profile-overview";
import { getPosts } from "@/services/feed.service";
import { reactPost, savePost } from "@/services/post.service";
import { formatReelCount, getReels } from "@/services/reel.service";
import {
  followUser,
  getUserProfile,
  sendFriendRequest,
  type UserProfile,
} from "@/services/user.service";
import { colors, spacing } from "@/theme";
import type { FeedPost } from "@/types/feed";
import type { Reel } from "@/types/reel";

const PROFILE_PAGE_SIZE = 30;

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const getUsername = (name: string) =>
  `@${name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()}`;

const getFriendLabel = (status?: string | null) => {
  const normalized = status?.toLowerCase();
  if (normalized === "pending") return "Đã gửi lời mời";
  if (normalized === "accepted") return "Đã kết bạn";
  return "Kết bạn";
};

export function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentTargetType, setCommentTargetType] = useState<"post" | "reel" | null>(
    null,
  );
  const [reelCommentEvent, setReelCommentEvent] = useState<{
    id: string;
    nonce: number;
  } | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setLoadErrorMessage("");
    try {
      const [nextProfile, postsResponse, reelsResponse] = await Promise.all([
        getUserProfile(userId),
        getPosts({ page: 1, pageSize: PROFILE_PAGE_SIZE, userId }),
        getReels({ page: 1, pageSize: PROFILE_PAGE_SIZE, sort: "popular", userId }),
      ]);

      setProfile(nextProfile);
      setPosts(postsResponse.posts);
      setReels(reelsResponse.reels);
    } catch (error) {
      setProfile(null);
      setPosts([]);
      setReels([]);
      setLoadErrorMessage(
        error instanceof Error ? error.message : "Không tìm thấy hồ sơ.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const openUserProfile = (nextUserId: string) => {
    if (nextUserId === userId) return;
    router.push({ pathname: "/users/[userId]", params: { userId: nextUserId } });
  };

  const handleFollow = async () => {
    if (!profile || isActionLoading) return;

    setIsActionLoading(true);
    try {
      const result = await followUser(profile.id);
      setProfile((current) =>
        current
          ? {
              ...current,
              followerCount: result.followerCount,
              isFollowing: result.isFollowing,
            }
          : current,
      );
    } catch (error) {
      Alert.alert(
        "Không thể theo dõi",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFriendAction = async () => {
    if (!profile || isActionLoading) return;

    const friendshipStatus = profile.friendship?.status?.toLowerCase();
    if (friendshipStatus === "pending" || friendshipStatus === "accepted") return;

    setIsActionLoading(true);
    try {
      const result = await sendFriendRequest(profile.id);
      setProfile((current) =>
        current
          ? {
              ...current,
              friendship: {
                isRequester: true,
                status: result.status || "pending",
              },
            }
          : current,
      );

      if (result.message) {
        Alert.alert("Đã gửi lời mời", result.message);
      }
    } catch (error) {
      Alert.alert(
        "Không thể gửi lời mời kết bạn",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleChat = () => {
    if (!profile?.canMessage) return;
    router.push({
      pathname: "/(tabs)/chat",
      params: profile.conversationId
        ? { conversationId: profile.conversationId }
        : undefined,
    });
  };

  const handleReactPost = async (postId: string, reactionType: number) => {
    try {
      const result = await reactPost(postId, reactionType);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                isReacted: result.isReacted,
                reactionType: result.reactionType,
                reactions: result.reactionCount,
              }
            : post,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Không thể thả cảm xúc",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  const handleSavePost = async (postId: string) => {
    try {
      const result = await savePost(postId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, isSaved: result.isSaved, saveCount: result.saveCount }
            : post,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Không thể lưu bài viết",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  const handleSharePost = async (postId: string) => {
    const link = `${process.env.EXPO_PUBLIC_API_URL}/posts/${postId}`;
    await Share.share({ message: `Xem bài viết này trên Viora\n${link}`, url: link });
  };

  const handleReactReel = async (reelId: string) => {
    try {
      const result = await reactPost(reelId, 1);
      setReels((current) =>
        current.map((reel) =>
          reel.id === reelId
            ? {
                ...reel,
                isReacted: result.isReacted,
                likes: formatReelCount(result.reactionCount),
                reactionCount: result.reactionCount,
                reactionType: result.reactionType,
              }
            : reel,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Không thể thả tim reels",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  const handleSaveReel = async (reelId: string) => {
    try {
      const result = await savePost(reelId);
      setReels((current) =>
        current.map((reel) =>
          reel.id === reelId
            ? { ...reel, isSaved: result.isSaved, saveCount: result.saveCount }
            : reel,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Không thể lưu reels",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  const handleShareReel = async (reel: Reel) => {
    const link = `${process.env.EXPO_PUBLIC_API_URL}/reels/${reel.id}`;
    await Share.share({ message: `Xem reels này trên Viora\n${link}`, url: link });
  };

  const openPostComments = (postId: string) => {
    setCommentTargetType("post");
    setCommentsPostId(postId);
  };

  const openReelComments = (reelId: string) => {
    setCommentTargetType("reel");
    setCommentsPostId(reelId);
  };

  const handleCommentCreated = (postId: string) => {
    if (commentTargetType === "post") {
      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, comments: post.comments + 1 } : post,
        ),
      );
      return;
    }

    setReelCommentEvent({ id: postId, nonce: Date.now() });
    setReels((current) =>
      current.map((reel) => {
        if (reel.id !== postId) return reel;
        const count = Number.parseInt(reel.comments.replace(/\D/g, ""), 10);
        return { ...reel, comments: formatReelCount(Number.isFinite(count) ? count + 1 : 1) };
      }),
    );
  };

  if (isLoading && !profile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>
          {loadErrorMessage || "Không tìm thấy hồ sơ."}
        </Text>
      </View>
    );
  }

  const stats = [
    { label: "Bài viết/Video", value: formatCount(profile.postCount) },
    { label: "Người theo dõi", value: formatCount(profile.followerCount) },
    { label: "Đang theo dõi", value: formatCount(profile.followingCount) },
    { label: "Bạn bè", value: formatCount(profile.friendCount) },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {profile.displayName}
        </Text>
        <Pressable
          accessibilityLabel="Tùy chọn hồ sơ"
          accessibilityRole="button"
          hitSlop={10}
          style={styles.headerButton}
        >
          <Ionicons color={colors.text} name="ellipsis-horizontal" size={23} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileOverview
          avatar={profile.avatarUrl}
          cover={profile.coverUrl}
          handle={getUsername(profile.displayName)}
          isVerified={profile.isVerified}
          name={profile.displayName}
        />
        <View style={styles.actionWrap}>
          <ProfileActions
            canMessage={profile.canMessage}
            friendLabel={getFriendLabel(profile.friendship?.status)}
            friendshipStatus={profile.friendship?.status ?? null}
            isActionLoading={isActionLoading}
            isFollowing={profile.isFollowing}
            onChat={handleChat}
            onFollow={handleFollow}
            onFriend={handleFriendAction}
          />
        </View>
        <ProfileContent
          isLoading={isLoading}
          onCommentPost={openPostComments}
          onCommentReel={openReelComments}
          onOpenAuthor={openUserProfile}
          onReactPost={handleReactPost}
          onReactReel={handleReactReel}
          onSavePost={handleSavePost}
          onSaveReel={handleSaveReel}
          onSharePost={handleSharePost}
          onShareReel={handleShareReel}
          posts={posts}
          reelCommentEvent={reelCommentEvent}
          reels={reels}
          reelsPaused={commentsPostId !== null}
          stats={stats}
        />
      </ScrollView>
      <CommentsModal
        onClose={() => {
          setCommentsPostId(null);
          setCommentTargetType(null);
        }}
        onCommentCreated={handleCommentCreated}
        onOpenUser={openUserProfile}
        postId={commentsPostId}
        visible={commentsPostId !== null}
      />
    </View>
  );
}

function ProfileActions({
  canMessage,
  friendLabel,
  friendshipStatus,
  isActionLoading,
  isFollowing,
  onChat,
  onFollow,
  onFriend,
}: {
  canMessage: boolean;
  friendLabel: string;
  friendshipStatus: string | null;
  isActionLoading: boolean;
  isFollowing: boolean;
  onChat: () => void;
  onFollow: () => void;
  onFriend: () => void;
}) {
  const normalizedFriendshipStatus = friendshipStatus?.toLowerCase();
  const isFriendActionDisabled =
    isActionLoading ||
    normalizedFriendshipStatus === "pending" ||
    normalizedFriendshipStatus === "accepted";
  const isFriendAccepted = normalizedFriendshipStatus === "accepted";
  const isFriendPending = normalizedFriendshipStatus === "pending";

  return (
    <View style={styles.actions}>
      <ActionButton
        disabled={isFriendActionDisabled}
        icon={isFriendAccepted ? "checkmark" : "person-add-outline"}
        label={friendLabel}
        onPress={onFriend}
        primary={!isFriendAccepted && !isFriendPending}
      />
      <ActionButton
        disabled={isActionLoading}
        icon={isFollowing ? "checkmark" : "add"}
        label={isFollowing ? "Đã theo dõi" : "Theo dõi"}
        onPress={onFollow}
        primary={!isFollowing}
      />
      {canMessage && (
        <ActionButton icon="chatbubble-outline" label="Trò chuyện" onPress={onChat} />
      )}
    </View>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
  primary,
}: {
  disabled?: boolean;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary && styles.primaryAction,
        pressed && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}
    >
      <Ionicons color={primary ? colors.white : colors.text} name={icon} size={17} />
      <Text style={[styles.actionText, primary && styles.primaryActionText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  actionDisabled: { opacity: 0.6 },
  actionPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  actionText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  content: { backgroundColor: colors.surface, flexGrow: 1 },
  header: {
    alignItems: "center",
    backgroundColor: "#F7F8FD",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: 40,
  },
  headerButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.surface,
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
  },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  primaryActionText: { color: colors.white },
  screen: { backgroundColor: colors.surface, flex: 1 },
});
