import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import type { ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CommentsModal } from "@/components/comments/comments-modal";
import { showAppToast } from "@/components/common/app-toast";
import { CreatePostModal } from "@/components/feed/create-post-modal";
import { FeedSearchModal } from "@/components/feed/feed-search-modal";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import type { FeedCategory } from "@/components/feed/feed-category-header";
import { ResponsiveContent } from "@/components/layout/responsive-content";
import {
  getFixedTopBarLayout,
  getResponsiveBottomPadding,
} from "@/components/layout/responsive-layout";
import {
  TAB_BAR_BOTTOM,
  TAB_BAR_HEIGHT,
} from "@/components/layout/tab-bar-style";
import { feedPosts as initialPosts } from "@/features/feed/data";
import { openProfileByUserId } from "@/features/profile/open-profile";
import { createPost, getPosts } from "@/services/feed.service";
import { trackArticleInteraction } from "@/services/article.service";
import {
  advertisementToFeedPost,
  createAdvertisementEventId,
  getAdvertisementDelivery,
  sendAdvertisementFeedback,
  trackAdvertisementClick,
  trackAdvertisementImpression,
} from "@/services/advertisement.service";
import {
  reactPost,
  savePost,
} from "@/services/post.service";
import { getPostShareLink } from "@/services/share-link.service";
import { getSession } from "@/stores/session-store";
import { useResponsive } from "@/hooks/use-responsive";
import { layout, spacing } from "@/theme";
import type { CreatePostInput, FeedPost, PostFeedSort } from "@/types/feed";
import { canCreateArticle } from "@/types/account-style";
import { AdvertisementFeedbackType, AdvertisementPlacement } from "@/types/advertisement";
import { insertAdvertisements } from "@/utils/advertisement-insertion";
import { type ThemeColors, useTheme } from "@/theme";


const PAGE_SIZE = 10;
type FeedContentCategory = Exclude<FeedCategory, "reels">;

export function FeedScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const initialCategory: FeedContentCategory =
    params.category === "articles" ? "articles" : "community";
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { isDesktopWeb, isLargeDesktop, isWeb } = useResponsive();
  const [activeCategory, setActiveCategory] =
    useState<FeedContentCategory>(initialCategory);
  const activeCategoryRef = useRef<FeedContentCategory>(initialCategory);
  const [articleSort, setArticleSort] = useState<PostFeedSort>("recommended");
  const articleSortRef = useRef<PostFeedSort>("recommended");
  const viewedArticleIdsRef = useRef(new Set<string>());
  const viewedAdvertisementIdsRef = useRef(new Set<string>());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60, minimumViewTime: 1_000 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<FeedPost>[] }) => {
      viewableItems.forEach(({ item }) => {
        if (item.advertisement && !viewedAdvertisementIdsRef.current.has(item.advertisement.id)) {
          viewedAdvertisementIdsRef.current.add(item.advertisement.id);
          void trackAdvertisementImpression(item.advertisement.id, createAdvertisementEventId("impression", item.advertisement.id)).catch(() => undefined);
        }
        if (activeCategoryRef.current === "articles" && item.postType === 2 && !item.advertisement && !viewedArticleIdsRef.current.has(item.id)) {
          viewedArticleIdsRef.current.add(item.id);
          void trackArticleInteraction(item.id, "impression").catch(() => undefined);
        }
      });
    },
  ).current;
  const loadRequestIdRef = useRef(0);
  const isCompactWeb = isWeb && !isDesktopWeb;
  const feedTopPadding = getFixedTopBarLayout({
    isArticle: activeCategory === "articles",
    isCompactWeb,
    isDesktopWeb,
    useDesktopSideRails: isDesktopWeb && isLargeDesktop,
  }).height;
  const feedBottomPadding = getResponsiveBottomPadding({
    desktopPadding: spacing.xl,
    isDesktopWeb,
    mobilePadding: TAB_BAR_BOTTOM + TAB_BAR_HEIGHT + insets.bottom + spacing.lg,
  });
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [myAvatar, setMyAvatar] = useState(initialPosts[0].avatar);
  const [myDisplayName, setMyDisplayName] = useState("Bạn");
  const [canPublishArticle, setCanPublishArticle] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const loadPosts = async (
    nextPage: number,
    category = activeCategoryRef.current,
    sort = articleSortRef.current,
  ) => {
    const requestId = ++loadRequestIdRef.current;
    if (nextPage === 1) {
      setIsLoading(true);
      setErrorMessage("");
    } else {
      setIsLoadingMore(true);
    }

    try {
      const [result, delivery] = await Promise.all([
        getPosts({
          page: nextPage,
          pageSize: PAGE_SIZE,
          postType: category === "community" ? 0 : 2,
          sort: category === "articles" ? sort : undefined,
        }),
        nextPage === 1
          ? getAdvertisementDelivery(category === "articles" ? AdvertisementPlacement.News : AdvertisementPlacement.Feed, 3).catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
      ]);

      if (
        loadRequestIdRef.current !== requestId ||
        activeCategoryRef.current !== category ||
        (category === "articles" && articleSortRef.current !== sort)
      ) return;

      setPosts((current) => {
        if (nextPage === 1) {
          return insertAdvertisements(
            result.posts,
            delivery.items.map(advertisementToFeedPost),
            { minimumGap: 6, maximumGap: 10, seed: category === "articles" ? 2 : 4 },
          ).map((entry) => entry.item);
        }
        const existingIds = new Set(current.map((post) => post.id));
        return [
          ...current,
          ...result.posts.filter((post) => !existingIds.has(post.id)),
        ];
      });
      setPage(nextPage);
      setTotalPages(result.totalPages);
    } catch (error) {
      if (
        loadRequestIdRef.current !== requestId ||
        activeCategoryRef.current !== category ||
        (category === "articles" && articleSortRef.current !== sort)
      ) return;
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể tải bài viết.",
      );
    } finally {
      if (
        loadRequestIdRef.current === requestId &&
        activeCategoryRef.current === category &&
        (category !== "articles" || articleSortRef.current === sort)
      ) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      const session = await getSession();
      if (session?.user?.avatarUrl) {
        setMyAvatar(session.user.avatarUrl);
      }
      if (session?.user?.displayName) {
        setMyDisplayName(session.user.displayName);
      }
      setCanPublishArticle(canCreateArticle(session?.user?.accountStyle));
    };

    loadCurrentUser();
    loadPosts(1, initialCategory);
  }, []);

  const selectCategory = (category: FeedContentCategory) => {
    if (activeCategoryRef.current === category) return;
    activeCategoryRef.current = category;
    setActiveCategory(category);
    setPosts([]);
    setPage(1);
    setTotalPages(1);
    void loadPosts(1, category);
  };

  useEffect(() => {
    const requestedCategory: FeedContentCategory =
      params.category === "articles" ? "articles" : "community";
    selectCategory(requestedCategory);
  }, [params.category]);

  const selectArticleSort = (sort: PostFeedSort) => {
    if (articleSortRef.current === sort) return;
    articleSortRef.current = sort;
    setArticleSort(sort);
    setPosts([]);
    setPage(1);
    setTotalPages(1);
    void loadPosts(1, "articles", sort);
  };

  const loadMorePosts = () => {
    if (isLoading || isLoadingMore || page >= totalPages) return;
    loadPosts(page + 1, activeCategoryRef.current, articleSortRef.current);
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
          "Hãy cho phép ANKT truy cập thư viện ảnh để chọn ảnh đăng bài.",
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
      if (activeCategoryRef.current === "community") {
        setPosts((current) => [newPost, ...current]);
      } else {
        activeCategoryRef.current = "community";
        setActiveCategory("community");
        await loadPosts(1, "community");
      }
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
        title: "ANKT",
        message: `Xem bài viết này trên ANKT\n${link.shareUrl}`,
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
  const handleNotInterested = async (postId: string) => {
    try {
      await trackArticleInteraction(postId, "notInterested");
      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (error) {
      Alert.alert(
        "Không thể cập nhật đề xuất",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };
  const openUserProfile = (userId: string) => {
    void openProfileByUserId(router, userId);
  };
  const openAdvertisement = async (post: FeedPost) => {
    const advertisement = post.advertisement;
    if (!advertisement) return;
    void trackAdvertisementClick(advertisement.id, createAdvertisementEventId("click", advertisement.id)).catch(() => undefined);
    if (advertisement.destinationUrl?.startsWith("https://")) {
      await Linking.openURL(advertisement.destinationUrl).catch(() => Alert.alert("Không thể mở liên kết", "Liên kết quảng cáo hiện không khả dụng."));
      return;
    }
    if (post.postType === 2) router.push({ pathname: "/article/[id]", params: { id: post.id } });
    else router.push({ pathname: "/post/[postId]", params: { postId: post.id } });
  };
  const handleAdvertisementFeedback = async (advertisementId: string, type: AdvertisementFeedbackType) => {
    try {
      await sendAdvertisementFeedback(advertisementId, type, type === AdvertisementFeedbackType.Report ? "Người dùng báo cáo từ menu quảng cáo." : undefined);
      setPosts((current) => current.filter((item) => item.advertisement?.id !== advertisementId));
      showAppToast({ title: "Đã cập nhật", message: type === AdvertisementFeedbackType.Report ? "Cảm ơn bạn đã báo cáo quảng cáo." : "Bạn sẽ không thấy quảng cáo này nữa.", type: "success" });
    } catch (error) { Alert.alert("Không thể cập nhật", error instanceof Error ? error.message : "Vui lòng thử lại."); }
  };
  const openWithImagePicker = async () => {
    const selectedUris = await pickImages();
    if (selectedUris) setModalVisible(true);
  };

  return (
    <View style={styles.screen}>
      <ResponsiveContent maxWidth={layout.feedMaxWidth}>
      {isLoading ? (
        <View style={{ paddingTop: feedTopPadding }}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            { paddingBottom: feedBottomPadding, paddingTop: feedTopPadding },
            posts.length === 0 && styles.emptyContent,
          ]}
          data={posts}
          keyExtractor={(item) => item.advertisement ? `advertisement:${item.advertisement.id}` : item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {errorMessage ||
                  (activeCategory === "articles"
                    ? "Chưa có bài báo"
                    : "Chưa có bài viết")}
              </Text>
              <Text style={styles.emptyText}>
                Kéo xuống để thử tải lại.
              </Text>
            </View>
          }
          ListFooterComponent={isLoadingMore ? <PostSkeleton /> : null}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.35}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onRefresh={() =>
            loadPosts(1, activeCategoryRef.current, articleSortRef.current)
          }
          refreshing={isLoading}
          renderItem={({ item }) => (
            <PostCard
              onAdvertise={(post) => router.push({ pathname: "/advertise/[postId]", params: { postId: post.id, postType: String(post.postType) } })}
              onAdvertisementFeedback={handleAdvertisementFeedback}
              onAdvertisementPress={(post) => void openAdvertisement(post)}
              onComment={setCommentsPostId}
              onDeleted={handleDeletedPost}
              onOpenAuthor={openUserProfile}
              onOpenArticle={(articleId) => router.push({ pathname: "/article/[id]", params: { id: articleId } })}
              onNotInterested={articleSort === "recommended" ? handleNotInterested : undefined}
              onReact={handleReactPost}
              onSave={handleSavePost}
              onShare={handleSharePost}
              post={item}
              variant={activeCategory === "articles" ? "news" : "default"}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <PostComposer
        activeCategory={activeCategory}
        articleSort={articleSort}
        avatar={myAvatar}
        canCreateArticle={canPublishArticle}
        displayName={myDisplayName}
        onArticlePress={() => router.push("/article/editor")}
        onArticleSortChange={selectArticleSort}
        onArticlesFeedPress={() => {
          router.setParams({ category: "articles" });
          selectCategory("articles");
        }}
        onCommunityPress={() => {
          router.setParams({ category: "community" });
          selectCategory("community");
        }}
        onCreatePress={() => setModalVisible(true)}
        onImagePress={openWithImagePicker}
        onReelsPress={() => router.push("/(tabs)/reels")}
        onSearchPress={() => setSearchVisible(true)}
      />
      </ResponsiveContent>
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
        articleSort={articleSort}
        category={activeCategory}
        onClose={() => setSearchVisible(false)}
        onOpenArticle={(articleId) => {
          setSearchVisible(false);
          router.push({ pathname: "/article/[id]", params: { id: articleId } });
        }}
        onOpenAuthor={(userId) => {
          setSearchVisible(false);
          openUserProfile(userId);
        }}
        onArticleSortChange={selectArticleSort}
        onShare={handleSharePost}
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
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    backgroundColor: colors.visuals.rgb_15_23_42_0_45,
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
  skeletonMedia: {
    backgroundColor: colors.border,
    height: 220,
    marginTop: spacing.md,
    width: "100%",
  },
  skeletonTextBlock: { flex: 1 },
});
