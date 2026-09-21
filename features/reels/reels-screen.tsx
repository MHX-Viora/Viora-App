import Ionicons from "@expo/vector-icons/Ionicons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import {
  Alert,
  AppState,
  Animated,
  Easing,
  FlatList,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CommentsModal } from "@/components/comments/comments-modal";
import { showAppToast } from "@/components/common/app-toast";
import { FeedCategoryHeader } from "@/components/feed/feed-category-header";
import { FixedTopBar } from "@/components/layout/fixed-top-bar";
import { DesktopDownloadPromo } from "@/components/landing/desktop-download-promo";
import { ResponsiveContent } from "@/components/layout/responsive-content";
import {
  getFixedTopBarLayout,
  getReelContentWidth,
  getReelsOverlayLayout,
  getResponsiveContentLayout,
} from "@/components/layout/responsive-layout";
import {
  createFloatingTabBarStyle,
  TAB_BAR_BOTTOM,
  TAB_BAR_HEIGHT,
} from "@/components/layout/tab-bar-style";
import type { SelectedVideo } from "@/components/reels/create-reel-modal";
import { CreateReelModal } from "@/components/reels/create-reel-modal";
import { ReelCard } from "@/components/reels/reel-card";
import { ReelsHeader } from "@/components/reels/reels-header";
import { ReelsSearchModal } from "@/components/reels/reels-search-modal";
import { openProfileByUserId } from "@/features/profile/open-profile";
import { getReelIndexFromOffset } from "@/features/reels/reel-pagination";
import { useResponsive } from "@/hooks/use-responsive";
import { reels } from "@/features/reels/data";
import { reactPost, savePost } from "@/services/post.service";
import { getReelShareLink } from "@/services/share-link.service";
import {
  advertisementToReel,
  createAdvertisementEventId,
  getAdvertisementDelivery,
  sendAdvertisementFeedback,
  trackAdvertisementClick,
  trackAdvertisementImpression,
} from "@/services/advertisement.service";
import {
  createReel as createReelApi,
  formatReelCount,
  getReels,
} from "@/services/reel.service";
import { layout, spacing } from "@/theme";
import type { Reel, ReelSort } from "@/types/reel";
import { AdvertisementFeedbackType, AdvertisementPlacement } from "@/types/advertisement";
import { insertAdvertisements } from "@/utils/advertisement-insertion";
import { type ThemeColors, useTheme } from "@/theme";


const PAGE_SIZE = 20;
const ITEM_GAP = 0;
const REEL_BOTTOM_INSET = TAB_BAR_BOTTOM + TAB_BAR_HEIGHT;

const getSafeVideoName = (name?: string | null) => {
  const fallback = `reel-${Date.now()}.mp4`;
  const safeName = (name || fallback).replace(/[^\w.-]/g, "-");
  return /\.(mp4|mov|m4v|webm)$/i.test(safeName) ? safeName : `${safeName}.mp4`;
};

const prepareVideoForUpload = async (
  asset: ImagePicker.ImagePickerAsset,
): Promise<SelectedVideo> => {
  const name = getSafeVideoName(asset.fileName);

  return {
    duration: asset.duration ?? null,
    name,
    type: asset.mimeType?.startsWith("video/") ? asset.mimeType : "video/mp4",
    uri: asset.uri,
  };
};

const SORT_EMPTY_MESSAGES: Record<
  ReelSort,
  { title: string; description: string }
> = {
  following: {
    title: "Chưa có reels từ người bạn theo dõi",
    description:
      "Khi người bạn theo dõi đăng reels mới, video sẽ xuất hiện ở đây.",
  },
  friends: {
    title: "Bạn bè chưa có reels",
    description: "Reels từ bạn bè của bạn sẽ được hiển thị tại đây.",
  },
  popular: {
    title: "Chưa có reels đề xuất",
    description: "ANKT sẽ hiển thị video nổi bật khi có nội dung phù hợp.",
  },
};

export function ReelsScreen() {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isDesktopWeb, isLargeDesktop, isWeb } = useResponsive();
  const reelsOverlayLayout = getReelsOverlayLayout({
    isCompactWeb: isWeb && !isDesktopWeb,
    isDesktopWeb,
  });
  const categoryTopBarLayout = getFixedTopBarLayout({
    categoryOnly: true,
    isCompactWeb: isWeb && !isDesktopWeb,
    isDesktopWeb,
    useDesktopSideRails: isDesktopWeb && isLargeDesktop,
  });
  const categoryHeaderContentLayout = getResponsiveContentLayout({
    isDesktopWeb,
    maxWidth: layout.feedMaxWidth,
  });
  const floatingTabBarStyle = useMemo(
    () => createFloatingTabBarStyle(theme),
    [theme],
  );
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const reelsListRef = useRef<FlatList<Reel>>(null);
  const viewedAdvertisementIdsRef = useRef(new Set<string>());
  const [reelItems, setReelItems] = useState(reels);
  const [sort, setSort] = useState<ReelSort>("popular");
  const [reelHeight, setReelHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const [reelsMessage, setReelsMessage] = useState("");
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active",
  );
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [isSearchDetailVisible, setIsSearchDetailVisible] = useState(false);
  const [searchCommentEvent, setSearchCommentEvent] = useState<{
    id: string;
    nonce: number;
  } | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [isCreatingReel, setIsCreatingReel] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(
    null,
  );

  const loadReels = useCallback(async (nextSort: ReelSort) => {
    setIsLoadingReels(true);
    setReelsMessage("");

    try {
      const [response, delivery] = await Promise.all([
        getReels({ page: 1, pageSize: PAGE_SIZE, sort: nextSort }),
        getAdvertisementDelivery(AdvertisementPlacement.Reels, 3).catch(() => ({ items: [] })),
      ]);
      setReelItems(insertAdvertisements(
        response.reels,
        delivery.items.map(advertisementToReel),
        { minimumGap: 8, maximumGap: 12, seed: 3 },
      ).map((entry) => entry.item));
      setActiveIndex(0);
      requestAnimationFrame(() =>
        reelsListRef.current?.scrollToOffset({ animated: false, offset: 0 }),
      );
    } catch (error) {
      setReelItems([]);
      setReelsMessage(
        error instanceof Error ? error.message : "Không thể tải reels.",
      );
    } finally {
      setIsLoadingReels(false);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setIsAppActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    loadReels(sort);
  }, [loadReels, sort]);

  useEffect(() => {
    const advertisement = reelItems[activeIndex]?.advertisement;
    if (!advertisement || viewedAdvertisementIdsRef.current.has(advertisement.id) || !isFocused || !isAppActive) return;
    viewedAdvertisementIdsRef.current.add(advertisement.id);
    void trackAdvertisementImpression(advertisement.id, createAdvertisementEventId("impression", advertisement.id)).catch(() => undefined);
  }, [activeIndex, isAppActive, isFocused, reelItems]);

  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({
      tabBarStyle: isSearchDetailVisible
        ? { display: "none" }
        : floatingTabBarStyle,
    });

    return () => {
      parent?.setOptions({ tabBarStyle: floatingTabBarStyle });
    };
  }, [floatingTabBarStyle, isSearchDetailVisible, navigation]);

  const searchReels = useCallback(
    async (keyword: string) => {
      const response = await getReels({
        keyword,
        page: 1,
        pageSize: PAGE_SIZE,
        sort,
      });
      return response.reels;
    },
    [sort],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight !== reelHeight) setReelHeight(nextHeight);
  };

  const handleInteractionLockChange = useCallback((locked: boolean) => {
    setIsInteractionLocked(locked);
  }, []);
  const openAdvertisement = useCallback(async (reel: Reel) => {
    const advertisement = reel.advertisement;
    if (!advertisement) return;
    void trackAdvertisementClick(advertisement.id, createAdvertisementEventId("click", advertisement.id)).catch(() => undefined);
    if (advertisement.destinationUrl?.startsWith("https://")) {
      await Linking.openURL(advertisement.destinationUrl).catch(() => Alert.alert("Không thể mở liên kết", "Liên kết quảng cáo hiện không khả dụng."));
    } else {
      router.push({ pathname: "/reel/[reelId]", params: { reelId: reel.id } });
    }
  }, []);
  const handleAdvertisementFeedback = useCallback(async (advertisementId: string, type: AdvertisementFeedbackType) => {
    try {
      await sendAdvertisementFeedback(advertisementId, type, type === AdvertisementFeedbackType.Report ? "Người dùng báo cáo từ menu quảng cáo." : undefined);
      setReelItems((current) => current.filter((item) => item.advertisement?.id !== advertisementId));
      showAppToast({ title: "Đã cập nhật", message: type === AdvertisementFeedbackType.Report ? "Cảm ơn bạn đã báo cáo quảng cáo." : "Bạn sẽ không thấy quảng cáo này nữa.", type: "success" });
    } catch (error) { Alert.alert("Không thể cập nhật", error instanceof Error ? error.message : "Vui lòng thử lại."); }
  }, []);

  const handleReelsScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = getReelIndexFromOffset({
        itemCount: reelItems.length,
        itemHeight: reelHeight + ITEM_GAP,
        offsetY: event.nativeEvent.contentOffset.y,
      });
      setActiveIndex((current) =>
        current === nextIndex ? current : nextIndex,
      );
    },
    [reelHeight, reelItems.length],
  );

  const pickVideo = async () => {
    if (Platform.OS !== "web") {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập",
          "Hãy cho phép ANKT truy cập thư viện để chọn video đăng Reels.",
        );
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    try {
      setSelectedVideo(await prepareVideoForUpload(asset));
    } catch (error) {
      showAppToast({
        message:
          error instanceof Error ? error.message : "Vui lòng chọn video khác.",
        title: "Không thể chuẩn bị video",
        type: "error",
      });
    }
  };

  const closeCreate = () => {
    if (isCreatingReel) return;
    setCreateVisible(false);
    setSelectedVideo(null);
  };

  const createReel = (caption: string, hashtags: string) => {
    if (!selectedVideo) return;
    const newReel: Reel = {
      id: `local-${Date.now()}`,
      authorId: null,
      author: "ban",
      avatar: reels[0].avatar,
      caption: caption || "Video mới của tôi",
      hashtags,
      isAuthorVerified: false,
      isFollowing: false,
      isMine: true,
      isReacted: false,
      isSaved: false,
      reactionCount: 0,
      reactionType: 0,
      saveCount: 0,
      shareCount: 0,
      thumbnailUrl: "",
      videoUrl: selectedVideo.uri,
      sourceSize: "Video đã tải lên",
      likes: "0",
      comments: "0",
    };
    setReelItems((current) => [newReel, ...current]);
    setActiveIndex(0);
    closeCreate();
    showAppToast({
      message: "Video của bạn đã được thêm vào danh sách.",
      title: "Đăng video thành công",
      type: "success",
    });
    requestAnimationFrame(() =>
      reelsListRef.current?.scrollToOffset({ animated: false, offset: 0 }),
    );
  };

  const createReelWithApi = async (caption: string, hashtags: string[]) => {
    if (!selectedVideo || isCreatingReel) return;

    setIsCreatingReel(true);
    try {
      const newReel = await createReelApi({
        content: caption,
        hashtags,
        videoName: selectedVideo.name,
        videoType: selectedVideo.type,
        videoUri: selectedVideo.uri,
      });
      setReelItems((current) => [newReel, ...current]);
      setActiveIndex(0);
      setCreateVisible(false);
      setSelectedVideo(null);
      showAppToast({
        message: "Video của bạn đã được đăng.",
        title: "Đăng video thành công",
        type: "success",
      });
      requestAnimationFrame(() =>
        reelsListRef.current?.scrollToOffset({ animated: false, offset: 0 }),
      );
    } catch (error) {
      showAppToast({
        message: error instanceof Error ? error.message : "Vui lòng thử lại.",
        title: "Không thể đăng video",
        type: "error",
      });
    } finally {
      setIsCreatingReel(false);
    }
  };

  const handleReactReel = async (reelId: string) => {
    try {
      const result = await reactPost(reelId, 1);
      setReelItems((current) =>
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
      setReelItems((current) =>
        current.map((reel) =>
          reel.id === reelId
            ? {
                ...reel,
                isSaved: result.isSaved,
                saveCount: result.saveCount,
              }
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
        title: "ANKT",
        message: `Xem reels này trên ANKT\n${link.shareUrl}`,
        url: link.shareUrl,
      });
    } catch (error) {
      Alert.alert(
        "Không thể chia sẻ",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  const handleCommentCreated = (reelId: string) => {
    setSearchCommentEvent({ id: reelId, nonce: Date.now() });
    setReelItems((current) =>
      current.map((reel) => {
        if (reel.id !== reelId) return reel;

        const nextCommentCount =
          Number.parseInt(reel.comments.replace(/\D/g, ""), 10) + 1;

        return {
          ...reel,
          comments: Number.isFinite(nextCommentCount)
            ? String(nextCommentCount)
            : reel.comments,
        };
      }),
    );
  };

  const handleDeletedReel = (reelId: string) => {
    setReelItems((current) => current.filter((reel) => reel.id !== reelId));
  };

  const openUserProfile = (userId: string) => {
    void openProfileByUserId(router, userId);
  };

  const reelContentWidth = getReelContentWidth({
    height: reelHeight,
    maxWidth: layout.reelsMaxWidth,
  });

  return (
    <View style={styles.page}>
      <FixedTopBar categoryOnly>
        <View style={categoryHeaderContentLayout}>
          <FeedCategoryHeader
            activeCategory="reels"
            onCommunityPress={() =>
              router.replace({
                pathname: "/(tabs)",
                params: { category: "community" },
              })
            }
            onReelsPress={() => undefined}
            onArticlesPress={() =>
              router.replace({
                pathname: "/(tabs)",
                params: { category: "articles" },
              })
            }
          />
          <DesktopDownloadPromo />
        </View>
      </FixedTopBar>
      <ResponsiveContent
        maxWidth={reelContentWidth}
        style={{
          paddingBottom: isDesktopWeb ? 0 : REEL_BOTTOM_INSET,
          paddingTop: categoryTopBarLayout.height,
        }}
      >
      <View onLayout={handleLayout} style={styles.container}>
      {isLoadingReels ? (
        <ReelsLoadingSkeleton height={reelHeight} />
      ) : reelItems.length === 0 ? (
        <EmptyReels message={reelsMessage} sort={sort} />
      ) : (
        reelHeight > 0 && (
          <FlatList
            data={reelItems}
            contentContainerStyle={{
              rowGap: ITEM_GAP,
            }}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              index,
              length: reelHeight + ITEM_GAP,
              offset: (reelHeight + ITEM_GAP) * index,
            })}
            keyExtractor={(item) => item.advertisement ? `advertisement:${item.advertisement.id}` : item.id}
            onMomentumScrollEnd={handleReelsScroll}
            onScroll={handleReelsScroll}
            pagingEnabled
            ref={reelsListRef}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            renderItem={({ index, item }) => (
              <ReelCard
                onAdvertise={(reel) => router.push({ pathname: "/advertise/[postId]", params: { postId: reel.id, postType: "1" } })}
                onAdvertisementFeedback={handleAdvertisementFeedback}
                onAdvertisementPress={(reel) => void openAdvertisement(reel)}
                active={
                  isAppActive &&
                  isFocused &&
                  !searchVisible &&
                  commentsPostId === null &&
                  !createVisible &&
                  index === activeIndex
                }
                height={reelHeight}
                onInteractionLockChange={
                  index === activeIndex
                    ? handleInteractionLockChange
                    : undefined
                }
                onComment={setCommentsPostId}
                onDelete={handleDeletedReel}
                onOpenAuthor={openUserProfile}
                onReact={handleReactReel}
                onSave={handleSaveReel}
                onShare={handleShareReel}
                reel={item}
                videoTopOffset={reelsOverlayLayout.videoTopOffset}
                videoVerticalShift={0}
              />
            )}
            scrollEnabled={!isInteractionLocked}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            windowSize={3}
          />
        )
      )}
      <ReelsHeader
        activeSort={sort}
        height={reelsOverlayLayout.headerHeight}
        onCreatePress={() => setCreateVisible(true)}
        onSearchPress={() => setSearchVisible(true)}
        onSortChange={setSort}
        paddingTop={reelsOverlayLayout.headerPaddingTop}
      />
      <ReelsSearchModal
        onClose={() => setSearchVisible(false)}
        onComment={setCommentsPostId}
        onCommentCreated={searchCommentEvent}
        onDelete={handleDeletedReel}
        onOpenAuthor={openUserProfile}
        onReact={handleReactReel}
        onSearch={searchReels}
        onSave={handleSaveReel}
        onShare={handleShareReel}
        onViewingChange={setIsSearchDetailVisible}
        paused={commentsPostId !== null}
        visible={searchVisible}
      />
      <CreateReelModal
        isSubmitting={isCreatingReel}
        onClose={closeCreate}
        onPickVideo={pickVideo}
        onRecordVideo={setSelectedVideo}
        onSubmit={createReelWithApi}
        selectedVideo={selectedVideo}
        visible={createVisible}
      />
      <CommentsModal
        onClose={() => setCommentsPostId(null)}
        onCommentCreated={handleCommentCreated}
        onOpenUser={openUserProfile}
        postId={commentsPostId}
        visible={commentsPostId !== null}
      />
      </View>
      </ResponsiveContent>
    </View>
  );
}

function EmptyReels({ message, sort }: { message: string; sort: ReelSort }) {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const emptyMessage = SORT_EMPTY_MESSAGES[sort];

  return (
    <View style={styles.centerState}>
      <Ionicons color={colors.white} name="videocam-outline" size={40} />
      <Text style={styles.centerTitle}>{message || emptyMessage.title}</Text>
      <Text style={styles.centerText}>
        {message
          ? "Kéo xuống hoặc đổi tab để thử lại."
          : emptyMessage.description}
      </Text>
    </View>
  );
}

function ReelsLoadingSkeleton({ height }: { height: number }) {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 780,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 780,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.42,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={[styles.skeletonScreen, height > 0 && { height }]}>
      <Animated.View style={[styles.skeletonVideoFrame, { opacity }]}>
        <View style={styles.skeletonPlay} />
      </Animated.View>
      <View style={styles.skeletonBottom}>
        <Animated.View style={[styles.skeletonCopy, { opacity }]}>
          <View style={styles.skeletonLineWide} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLineShort} />
        </Animated.View>
        <Animated.View style={[styles.skeletonRail, { opacity }]}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonCircle} />
          <View style={styles.skeletonCircle} />
          <View style={styles.skeletonCircle} />
        </Animated.View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  centerState: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.xl,
  },
  centerText: {
    color: colors.visuals.rgb_255_255_255_0_72,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  centerTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  container: { backgroundColor: colors.reelBackground, flex: 1 },
  page: { backgroundColor: colors.reelBackground, flex: 1 },
  skeletonAvatar: {
    backgroundColor: colors.visuals.rgb_255_255_255_0_18,
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  skeletonBottom: {
    alignItems: "flex-end",
    bottom: 34,
    flexDirection: "row",
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
  },
  skeletonCircle: {
    backgroundColor: colors.visuals.rgb_255_255_255_0_18,
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  skeletonCopy: { flex: 1, gap: spacing.sm, paddingRight: spacing.lg },
  skeletonLine: {
    backgroundColor: colors.visuals.rgb_255_255_255_0_16,
    borderRadius: 4,
    height: 14,
    width: "72%",
  },
  skeletonLineShort: {
    backgroundColor: colors.visuals.rgb_97_211_242_0_2,
    borderRadius: 4,
    height: 14,
    width: "48%",
  },
  skeletonLineWide: {
    backgroundColor: colors.visuals.rgb_255_255_255_0_22,
    borderRadius: 5,
    height: 18,
    width: "54%",
  },
  skeletonPlay: {
    alignSelf: "center",
    backgroundColor: colors.visuals.rgb_255_255_255_0_16,
    borderRadius: 28,
    height: 56,
    marginTop: "72%",
    width: 56,
  },
  skeletonRail: { alignItems: "center", gap: spacing.md, width: 52 },
  skeletonScreen: {
    alignItems: "center",
    backgroundColor: colors.reelBackground,
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  skeletonVideoFrame: {
    aspectRatio: 21 / 32,
    backgroundColor: colors.visuals.rgb_255_255_255_0_08,
    maxHeight: "100%",
    width: "100%",
  },
});


