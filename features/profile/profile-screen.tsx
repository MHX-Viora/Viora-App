import { router } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CommentsModal } from "@/components/comments/comments-modal";
import {
  TAB_BAR_BOTTOM,
  TAB_BAR_HEIGHT,
} from "@/components/layout/tab-bar-style";
import { ProfileContent } from "@/components/profile/profile-content";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileOverview } from "@/components/profile/profile-overview";
import { ProfileQrModal } from "@/components/profile/profile-qr-modal";
import { ProfileSettingsSheet } from "@/components/profile/profile-settings-sheet";
import { openProfileByUserId } from "@/features/profile/open-profile";
import { logout } from "@/services/auth.service";
import { getPosts } from "@/services/feed.service";
import { reactPost, savePost } from "@/services/post.service";
import { formatReelCount, getReels } from "@/services/reel.service";
import { unregisterCurrentDevicePushToken } from "@/services/push-notification.service";
import { stopRealtime } from "@/services/realtime.service";
import {
  getPostShareLink,
  getReelShareLink,
  getUserShareLink,
} from "@/services/share-link.service";
import { getMyStatistics } from "@/services/user.service";
import { clearSession, getSession } from "@/stores/session-store";
import type { User } from "@/types/auth";
import type { FeedPost } from "@/types/feed";
import type { Reel } from "@/types/reel";
import { spacing, type ThemeColors, useTheme } from "@/theme";


const PROFILE_PAGE_SIZE = 30;

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

export function ProfileScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const profileBottomPadding =
    TAB_BAR_BOTTOM + TAB_BAR_HEIGHT + insets.bottom + spacing.xl;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileContentLoading, setIsProfileContentLoading] = useState(true);
  const [profilePosts, setProfilePosts] = useState<FeedPost[]>([]);
  const [profileReels, setProfileReels] = useState<Reel[]>([]);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentTargetType, setCommentTargetType] = useState<"post" | "reel" | null>(
    null,
  );
  const [reelCommentEvent, setReelCommentEvent] = useState<{
    id: string;
    nonce: number;
  } | null>(null);
  const [profileStats, setProfileStats] = useState([
    { label: "Bài viết/Video", value: "0" },
    { label: "Người theo dõi", value: "0" },
    { label: "Đang theo dõi", value: "0" },
    { label: "Bạn bè", value: "0" },
  ]);
  const [showQr, setShowQr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profileShareUrl, setProfileShareUrl] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const session = await getSession();

      // Không có session thì quay lại login.
      if (!session?.accessToken) {
        router.replace("/login");
        return;
      }

      // Có token nhưng chưa có user thì quay lại bước hoàn thiện hồ sơ.
      if (session.user === null) {
        router.replace("/complete-profile");
        return;
      }

      setUser(session.user);
      setIsLoading(false);

      try {
        const [statistics, postsResponse, reelsResponse, shareLink] = await Promise.all([
          getMyStatistics(),
          getPosts({
            page: 1,
            pageSize: PROFILE_PAGE_SIZE,
            userId: session.user.id,
          }),
          getReels({
            page: 1,
            pageSize: PROFILE_PAGE_SIZE,
            sort: "popular",
            userId: session.user.id,
          }),
          getUserShareLink(session.user.id).catch(() => null),
        ]);

        setProfileStats([
          { label: "Bài viết/Video", value: formatCount(statistics.postCount) },
          {
            label: "Người theo dõi",
            value: formatCount(statistics.followerCount),
          },
          {
            label: "Đang theo dõi",
            value: formatCount(statistics.followingCount),
          },
          { label: "Bạn bè", value: formatCount(statistics.friendCount) },
        ]);
        setProfilePosts(postsResponse.posts);
        setProfileReels(reelsResponse.reels);
        setProfileShareUrl(shareLink?.shareUrl ?? "");
      } catch {
        setProfileStats((current) => current);
      } finally {
        setIsProfileContentLoading(false);
      }
    };

    loadUser();
  }, []);

  if (isLoading || user === null) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  const profileName = user.displayName;
  const profileAvatar = user.avatarUrl;
  const profileCover = user.coverUrl;

  const username = user.displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

  const profileHandle = `@${username}`;

  const handleReactReel = async (reelId: string) => {
    try {
      const result = await reactPost(reelId, 1);
      setProfileReels((current) =>
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

  const handleReactPost = async (postId: string, reactionType: number) => {
    try {
      const result = await reactPost(postId, reactionType);
      setProfilePosts((current) =>
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
      setProfilePosts((current) =>
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
    try {
      const link = await getPostShareLink(postId);
      await Share.share({
        title: "Viora",
        message: `Xem bài viết này trên Viora\n${link.shareUrl}`,
        url: link.shareUrl,
      });
    } catch (error) {
      Alert.alert(
        "Không thể chia sẻ",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  const handleDeletedPost = (postId: string) => {
    setProfilePosts((current) => current.filter((post) => post.id !== postId));
  };

  const openUserProfile = (userId: string) => {
    if (userId === user.id) return;
    void openProfileByUserId(router, userId);
  };

  const openPostComments = (postId: string) => {
    setCommentTargetType("post");
    setCommentsPostId(postId);
  };

  const openReelComments = (reelId: string) => {
    setCommentTargetType("reel");
    setCommentsPostId(reelId);
  };

  const handleSaveReel = async (reelId: string) => {
    try {
      const result = await savePost(reelId);
      setProfileReels((current) =>
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
    try {
      const link = await getReelShareLink(reel.id);
      await Share.share({
        title: "Viora",
        message: `Xem reels này trên Viora\n${link.shareUrl}`,
        url: link.shareUrl,
      });
    } catch (error) {
      Alert.alert(
        "Không thể chia sẻ",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  const handleDeletedReel = (reelId: string) => {
    setProfileReels((current) => current.filter((reel) => reel.id !== reelId));
  };

  const handleCommentCreated = (reelId: string) => {
    if (commentTargetType === "post") {
      setProfilePosts((current) =>
        current.map((post) =>
          post.id === reelId ? { ...post, comments: post.comments + 1 } : post,
        ),
      );
      return;
    }

    setReelCommentEvent({ id: reelId, nonce: Date.now() });
    setProfileReels((current) =>
      current.map((reel) => {
        if (reel.id !== reelId) return reel;
        const count = Number.parseInt(reel.comments.replace(/\D/g, ""), 10);
        const nextCount = Number.isFinite(count) ? count + 1 : 1;
        return { ...reel, comments: formatReelCount(nextCount) };
      }),
    );
  };

  return (
    <View style={styles.screen}>
      <ProfileHeader
        onOpenFriends={() => router.push("/friends")}
        onOpenQr={() => setShowQr(true)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: profileBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileOverview
          avatar={profileAvatar}
          cover={profileCover}
          handle={profileHandle}
          name={profileName}
          onEdit={() => router.push("/edit-profile")}
          showEditButton
        />
        <ProfileContent
          isLoading={isProfileContentLoading}
          onCommentPost={openPostComments}
          onCommentReel={openReelComments}
          onDeletePost={handleDeletedPost}
          onDeleteReel={handleDeletedReel}
          onOpenAuthor={openUserProfile}
          onReactPost={handleReactPost}
          onReactReel={handleReactReel}
          onSavePost={handleSavePost}
          onSaveReel={handleSaveReel}
          onSharePost={handleSharePost}
          onShareReel={handleShareReel}
          posts={profilePosts}
          reelCommentEvent={reelCommentEvent}
          reels={profileReels}
          reelsPaused={commentsPostId !== null}
          stats={profileStats}
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
      <ProfileQrModal
        avatar={profileAvatar}
        handle={profileHandle}
        name={profileName}
        onClose={() => setShowQr(false)}
        onOpenProfile={(nextUserId) => {
          void openProfileByUserId(router, nextUserId);
        }}
        qrValue={profileShareUrl}
        visible={showQr}
      />
      <ProfileSettingsSheet
        onClose={() => setShowSettings(false)}
        onLogout={async () => {
          setShowSettings(false);
          await unregisterCurrentDevicePushToken();
          try {
            await logout();
          } catch {
            // Dù API logout lỗi, vẫn xoá session local để người dùng thoát app.
          }
          await stopRealtime();
          await clearSession();
          router.replace("/login");
        }}
        onOpenAccountSettings={() => {
          setShowSettings(false);
          router.push("/account-settings");
        }}
        onOpenLikedActivity={() => {
          setShowSettings(false);
          router.push({
            pathname: "/profile-activity",
            params: { kind: "reacted" },
          });
        }}
        onOpenPoliciesTerms={() => {
          setShowSettings(false);
          router.push("/policies-terms");
        }}
        onOpenSavedActivity={() => {
          setShowSettings(false);
          router.push({
            pathname: "/profile-activity",
            params: { kind: "saved" },
          });
        }}
        onOpenSecurityPrivacy={() => {
          setShowSettings(false);
          router.push("/security-privacy");
        }}
        onOpenSupport={() => {
          setShowSettings(false);
          router.push("/support");
        }}
        visible={showSettings}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { backgroundColor: colors.background, flexGrow: 1 },
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  screen: { backgroundColor: colors.background, flex: 1 },
});
