import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";

import { CommentsModal } from "@/components/comments/comments-modal";
import { showAppToast } from "@/components/common/app-toast";
import { CreatePostModal } from "@/components/feed/create-post-modal";
import { FeedSearchModal } from "@/components/feed/feed-search-modal";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { FIXED_TOP_BAR_HEIGHT } from "@/components/layout/fixed-top-bar";
import { feedPosts as initialPosts } from "@/features/feed/data";
import { communityColors as colors } from "@/features/feed/community-colors";
import { openProfileByUserId } from "@/features/profile/open-profile";
import { createPost, getPosts } from "@/services/feed.service";
import {
  reactPost,
  savePost,
} from "@/services/post.service";
import { getPostShareLink } from "@/services/share-link.service";
import { getSession } from "@/stores/session-store";
import { spacing } from "@/theme";
import type { CreatePostInput, FeedPost } from "@/types/feed";

const PAGE_SIZE = 10;

export function FeedScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [myAvatar, setMyAvatar] = useState(initialPosts[0].avatar);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const loadPosts = async (nextPage: number) => {
    if (nextPage === 1) {
      setIsLoading(true);
      setErrorMessage("");
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await getPosts({
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setPosts((current) =>
        nextPage === 1 ? result.posts : [...current, ...result.posts],
      );
      setPage(nextPage);
      setTotalPages(result.totalPages);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể tải bài viết.",
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      const session = await getSession();
      if (session?.user?.avatarUrl) {
        setMyAvatar(session.user.avatarUrl);
      }
    };

    loadCurrentUser();
    loadPosts(1);
  }, []);

  const loadMorePosts = () => {
    if (isLoading || isLoadingMore || page >= totalPages) return;
    loadPosts(page + 1);
  };

  const pickImages = async (): Promise<string[] | null> => {
    const remainingSlots = 4 - draftImages.length;
    if (remainingSlots === 0) return null;

    if (Platform.OS !== "web") {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập",
          "Hãy cho phép Viora truy cập thư viện ảnh để chọn ảnh đăng bài.",
        );
        return null;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      quality: 0.75,
      selectionLimit: remainingSlots,
    });
    if (result.canceled) return null;
    const selectedUris = result.assets
      .slice(0, remainingSlots)
      .map((asset) => asset.uri);
    setDraftImages((current) => [...current, ...selectedUris].slice(0, 4));
    return selectedUris;
  };

  const removeDraftImage = (indexToRemove: number) => {
    setDraftImages((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    setDraftImages([]);
  };
  const submitPost = async (payload: CreatePostInput) => {
    if (isCreatingPost) return;

    setIsCreatingPost(true);

    try {
      const newPost = await createPost(payload);
      setPosts((current) => [newPost, ...current]);
      closeModal();
      showAppToast({
        message: "Bài viết của bạn đã được đăng.",
        title: "Đăng bài thành công",
        type: "success",
      });
    } catch (error) {
      Alert.alert(
        "Không thể tạo bài viết",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setIsCreatingPost(false);
    }
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

  const handleCommentCreated = (postId: string) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, comments: post.comments + 1 } : post,
      ),
    );
  };

  const handleDeletedPost = (postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
  };
  const openUserProfile = (userId: string) => {
    void openProfileByUserId(router, userId);
  };
  const openWithImagePicker = async () => {
    const selectedUris = await pickImages();
    if (selectedUris) setModalVisible(true);
  };

  return (
    <View style={styles.screen}>
      {isLoading ? (
        <View style={styles.skeletonList}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.content,
            posts.length === 0 && styles.emptyContent,
          ]}
          data={posts}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {errorMessage || "Chưa có bài viết"}
              </Text>
              <Text style={styles.emptyText}>
                Kéo xuống để thử tải lại.
              </Text>
            </View>
          }
          ListFooterComponent={isLoadingMore ? <PostSkeleton /> : null}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.35}
          onRefresh={() => loadPosts(1)}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <PostCard
              onComment={setCommentsPostId}
              onDeleted={handleDeletedPost}
              onOpenAuthor={openUserProfile}
              onReact={handleReactPost}
              onSave={handleSavePost}
              onShare={handleSharePost}
              post={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <PostComposer
        avatar={myAvatar}
        onCreatePress={() => setModalVisible(true)}
        onImagePress={openWithImagePicker}
        onSearchPress={() => setSearchVisible(true)}
      />
      <CreatePostModal
        imageUris={draftImages}
        isSubmitting={isCreatingPost}
        onClose={closeModal}
        onPickImage={pickImages}
        onRemoveImage={removeDraftImage}
        onSubmit={submitPost}
        visible={modalVisible}
      />
      <FeedSearchModal
        onClose={() => setSearchVisible(false)}
        visible={searchVisible}
      />
      <CommentsModal
        onClose={() => setCommentsPostId(null)}
        onCommentCreated={handleCommentCreated}
        onOpenUser={openUserProfile}
        postId={commentsPostId}
        visible={commentsPostId !== null}
      />
    </View>
  );
}

function PostSkeleton() {
  const opacity = useRef(new Animated.Value(0.45)).current;

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

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
        <View style={styles.skeletonTextBlock}>
          <Animated.View style={[styles.skeletonLineLarge, { opacity }]} />
          <Animated.View style={[styles.skeletonLineSmall, { opacity }]} />
        </View>
      </View>
      <Animated.View style={[styles.skeletonBodyLine, { opacity }]} />
      <Animated.View style={[styles.skeletonBodyLineShort, { opacity }]} />
      <Animated.View style={[styles.skeletonMedia, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 10,
    paddingTop: FIXED_TOP_BAR_HEIGHT,
  },
  emptyContent: { flexGrow: 1 },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  screen: { backgroundColor: colors.background, flex: 1 },
  shareBackdrop: {
    backgroundColor: "rgba(15,23,42,0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  shareClose: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  shareHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shareLink: { color: colors.text, flex: 1, fontSize: 13 },
  shareLinkBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  shareOption: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 74,
    width: "23%",
  },
  shareOptions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shareOptionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  sharePostText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  shareSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  shareTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  skeletonAvatar: {
    backgroundColor: colors.border,
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  skeletonBodyLine: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    width: "82%",
  },
  skeletonBodyLineShort: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    width: "58%",
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    paddingBottom: spacing.md,
  },
  skeletonHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  skeletonLineLarge: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 13,
    width: 130,
  },
  skeletonLineSmall: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 11,
    marginTop: spacing.sm,
    width: 90,
  },
  skeletonList: { paddingTop: FIXED_TOP_BAR_HEIGHT },
  skeletonMedia: {
    backgroundColor: colors.border,
    height: 220,
    marginTop: spacing.md,
    width: "100%",
  },
  skeletonTextBlock: { flex: 1 },
});
