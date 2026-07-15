import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ReelCard } from "@/components/reels/reel-card";
import { formatReelCount } from "@/services/reel.service";
import { colors, spacing } from "@/theme";
import type { Reel } from "@/types/reel";

const ITEM_GAP = 1;

export function ReelsSearchModal({
  onClose,
  onComment,
  onDelete,
  onReact,
  onCommentCreated,
  onSearch,
  onSave,
  onShare,
  onViewingChange,
  paused,
  visible,
}: {
  onClose: () => void;
  onComment?: (reelId: string) => void;
  onDelete?: (reelId: string) => void;
  onReact?: (reelId: string) => void;
  onCommentCreated?: { id: string; nonce: number } | null;
  onSearch: (keyword: string) => Promise<Reel[]>;
  onSave?: (reelId: string) => void;
  onShare?: (reel: Reel) => void;
  onViewingChange?: (viewing: boolean) => void;
  paused?: boolean;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const viewerListRef = useRef<FlatList<Reel>>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Reel[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewerResults, setViewerResults] = useState<Reel[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerHeight, setViewerHeight] = useState(0);
  const [isViewerLocked, setIsViewerLocked] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const isViewing = viewerResults.length > 0;

  const resetSearch = () => {
    setQuery("");
    setResults([]);
    setError("");
    setLoading(false);
    setViewerResults([]);
    setViewerIndex(0);
    setIsViewerLocked(false);
  };

  const close = () => {
    resetSearch();
    onClose();
  };

  const goBack = () => {
    if (isViewing) {
      setViewerResults([]);
      setViewerIndex(0);
      setIsViewerLocked(false);
      return;
    }

    close();
  };

  const selectResult = (reel: Reel) => {
    const nextResults = results.length > 0 ? results : [reel];
    const nextIndex = Math.max(
      0,
      nextResults.findIndex((item) => item.id === reel.id),
    );

    setViewerResults(nextResults);
    setViewerIndex(nextIndex);

    requestAnimationFrame(() => {
      viewerListRef.current?.scrollToOffset({
        animated: false,
        offset: (viewerHeight + ITEM_GAP) * nextIndex,
      });
    });
  };

  const handleViewerLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight !== viewerHeight) setViewerHeight(nextHeight);
  };

  const updateViewerReel = (
    reelId: string,
    updater: (reel: Reel) => Reel,
  ) => {
    setViewerResults((current) =>
      current.map((reel) => (reel.id === reelId ? updater(reel) : reel)),
    );
  };

  const handleViewerReact = (reelId: string) => {
    updateViewerReel(reelId, (reel) => {
      const nextReacted = !reel.isReacted;
      const nextCount = Math.max(
        0,
        reel.reactionCount + (nextReacted ? 1 : -1),
      );

      return {
        ...reel,
        isReacted: nextReacted,
        likes: formatReelCount(nextCount),
        reactionCount: nextCount,
        reactionType: nextReacted ? 1 : 0,
      };
    });
    onReact?.(reelId);
  };

  const handleViewerSave = (reelId: string) => {
    updateViewerReel(reelId, (reel) => {
      const nextSaved = !reel.isSaved;
      return {
        ...reel,
        isSaved: nextSaved,
        saveCount: Math.max(0, reel.saveCount + (nextSaved ? 1 : -1)),
      };
    });
    onSave?.(reelId);
  };

  const handleViewerDelete = (reelId: string) => {
    setViewerResults((current) =>
      current.filter((reel) => reel.id !== reelId),
    );
    setResults((current) => current.filter((reel) => reel.id !== reelId));
    onDelete?.(reelId);
  };

  useEffect(() => {
    onViewingChange?.(visible && isViewing);
    return () => onViewingChange?.(false);
  }, [isViewing, onViewingChange, visible]);

  useEffect(() => {
    if (!onCommentCreated) return;

    updateViewerReel(onCommentCreated.id, (reel) => {
      const currentCount = Number.parseInt(reel.comments.replace(/\D/g, ""), 10);
      const nextCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;
      return { ...reel, comments: formatReelCount(nextCount) };
    });
  }, [onCommentCreated]);

  useEffect(() => {
    if (!visible || !normalizedQuery || isViewing) {
      if (!normalizedQuery) {
        setResults([]);
        setError("");
      }
      setLoading(false);
      return;
    }

    let ignored = false;
    setLoading(true);
    setError("");

    const timer = setTimeout(() => {
      onSearch(query)
        .then((nextResults) => {
          if (!ignored) setResults(nextResults);
        })
        .catch((searchError: unknown) => {
          if (!ignored) {
            setResults([]);
            setError(
              searchError instanceof Error
                ? searchError.message
                : "Không thể tìm kiếm reels.",
            );
          }
        })
        .finally(() => {
          if (!ignored) setLoading(false);
        });
    }, 350);

    return () => {
      ignored = true;
      clearTimeout(timer);
    };
  }, [isViewing, normalizedQuery, onSearch, query, visible]);

  return (
    <Modal animationType="slide" onRequestClose={goBack} visible={visible}>
      <SafeAreaView
        edges={isViewing ? [] : ["top"]}
        onLayout={handleViewerLayout}
        style={[styles.screen, isViewing && styles.viewerScreen]}
      >
        <View
          style={[
            styles.header,
            isViewing && styles.floatingHeader,
            isViewing && { paddingTop: insets.top },
          ]}
        >
          <Pressable
            accessibilityLabel={
              isViewing ? "Quay lại kết quả tìm kiếm" : "Đóng tìm kiếm video"
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={goBack}
            style={styles.backButton}
          >
            <Ionicons
              color={isViewing ? colors.white : colors.text}
              name="arrow-back"
              size={24}
            />
          </Pressable>
          <View style={[styles.searchBox, isViewing && styles.floatingSearchBox]}>
            <Ionicons
              color={isViewing ? colors.white : colors.textMuted}
              name="search"
              size={20}
            />
            <TextInput
              accessibilityLabel="Tìm kiếm video ngắn"
              autoFocus={!isViewing}
              onChangeText={(text) => {
                if (isViewing) {
                  setViewerResults([]);
                  setViewerIndex(0);
                }
                setQuery(text);
              }}
              placeholder="Tìm video, người đăng, hashtag..."
              placeholderTextColor={
                isViewing ? "rgba(255,255,255,0.78)" : colors.textMuted
              }
              returnKeyType="search"
              style={[styles.input, isViewing && styles.floatingInput]}
              value={query}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityLabel="Xóa nội dung tìm kiếm"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  setQuery("");
                  setViewerResults([]);
                }}
              >
                <Ionicons
                  color={isViewing ? colors.white : colors.textMuted}
                  name="close-circle"
                  size={20}
                />
              </Pressable>
            )}
          </View>
        </View>

        {isViewing ? (
          viewerHeight > 0 && (
            <FlatList
              key="search-viewer-list"
              contentContainerStyle={{ rowGap: ITEM_GAP }}
              data={viewerResults}
              decelerationRate="fast"
              getItemLayout={(_, index) => ({
                index,
                length: viewerHeight + ITEM_GAP,
                offset: (viewerHeight + ITEM_GAP) * index,
              })}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(event) =>
                setViewerIndex(
                  Math.round(
                    event.nativeEvent.contentOffset.y /
                      (viewerHeight + ITEM_GAP),
                  ),
                )
              }
              pagingEnabled
              ref={viewerListRef}
              renderItem={({ index, item }) => (
                <ReelCard
                  active={
                    visible && isViewing && !paused && index === viewerIndex
                  }
                  height={viewerHeight}
                  onInteractionLockChange={
                    index === viewerIndex ? setIsViewerLocked : undefined
                  }
                  onComment={onComment}
                  onDelete={handleViewerDelete}
                  onReact={handleViewerReact}
                  onSave={handleViewerSave}
                  onShare={onShare}
                  reel={item}
                  videoTopOffset={-24}
                />
              )}
              scrollEnabled={!isViewerLocked}
              showsVerticalScrollIndicator={false}
              windowSize={3}
            />
          )
        ) : normalizedQuery ? (
          <FlatList
            key="search-grid-list"
            columnWrapperStyle={
              results.length > 0 ? styles.resultRow : undefined
            }
            contentContainerStyle={[
              styles.listContent,
              results.length === 0 && styles.emptyList,
            ]}
            data={results}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              loading ? (
                <ReelSearchSkeleton />
              ) : (
                <EmptySearch
                  title="Không tìm thấy video"
                  description={
                    error || "Thử tìm bằng từ khóa hoặc hashtag khác"
                  }
                />
              )
            }
            numColumns={3}
            renderItem={({ item }) => (
              <ReelSearchResult onPress={() => selectResult(item)} reel={item} />
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptySearch
            title="Tìm kiếm video ngắn"
            description="Nhập tên người đăng, nội dung hoặc hashtag"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function ReelSearchResult({
  onPress,
  reel,
}: {
  onPress: () => void;
  reel: Reel;
}) {
  return (
    <Pressable
      accessibilityLabel={`Video của ${reel.author}: ${reel.caption}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.result}
    >
      <View style={styles.thumbnailFrame}>
        {reel.thumbnailUrl ? (
          <Image
            accessibilityLabel={`Ảnh bìa video của ${reel.author}`}
            contentFit="cover"
            source={{ uri: reel.thumbnailUrl }}
            style={styles.thumbnail}
          />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Ionicons color={colors.white} name="play" size={26} />
          </View>
        )}
        <View style={styles.thumbnailShade} />
        <View style={styles.metricPill}>
          <Ionicons color={colors.white} name="heart" size={12} />
          <Text style={styles.metricText}>{reel.likes}</Text>
        </View>
        <View style={styles.playBadge}>
          <Ionicons color={colors.white} name="play" size={14} />
        </View>
      </View>
      <Text numberOfLines={2} style={styles.caption}>
        {reel.caption || reel.hashtags || "Video Viora"}
      </Text>
      <View style={styles.authorRow}>
        <Image source={{ uri: reel.avatar }} style={styles.avatar} />
        <Text numberOfLines={1} style={styles.author}>
          {reel.author}
        </Text>
        {reel.isAuthorVerified && (
          <Ionicons color={colors.primary} name="checkmark-circle" size={12} />
        )}
      </View>
    </Pressable>
  );
}

function ReelSearchSkeleton() {
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
    <View
      accessibilityLabel="Đang tải kết quả tìm kiếm"
      style={styles.skeletonGrid}
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <View key={index} style={styles.skeletonItem}>
          <Animated.View style={[styles.skeletonPoster, { opacity }]} />
          <Animated.View style={[styles.skeletonLine, { opacity }]} />
          <Animated.View style={[styles.skeletonMeta, { opacity }]} />
        </View>
      ))}
    </View>
  );
}

function EmptySearch({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons color={colors.textMuted} name="videocam-outline" size={38} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  author: { color: colors.textMuted, flex: 1, fontSize: 11, fontWeight: "700" },
  authorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 5,
  },
  avatar: { borderRadius: 7, height: 14, width: 14 },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  caption: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 7,
    minHeight: 32,
  },
  emptyList: { flexGrow: 1 },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  floatingHeader: {
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    left: 0,
    paddingBottom: spacing.sm,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  floatingInput: { color: colors.white },
  floatingSearchBox: {
    backgroundColor: "rgba(15,23,42,0.42)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 40,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  metricPill: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.56)",
    borderRadius: 999,
    bottom: 7,
    flexDirection: "row",
    gap: 3,
    left: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: "absolute",
  },
  metricText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  playBadge: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 7,
    top: 7,
    width: 28,
  },
  result: {
    flex: 1,
    maxWidth: "33.333%",
    paddingBottom: spacing.md,
    paddingHorizontal: 3,
  },
  resultRow: { alignItems: "flex-start" },
  screen: { backgroundColor: colors.surface, flex: 1 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  skeletonItem: {
    paddingBottom: spacing.md,
    paddingHorizontal: 3,
    width: "33.333%",
  },
  skeletonLine: {
    backgroundColor: colors.border,
    borderRadius: 5,
    height: 10,
    marginTop: 8,
    width: "88%",
  },
  skeletonMeta: {
    backgroundColor: colors.border,
    borderRadius: 5,
    height: 9,
    marginTop: 6,
    width: "58%",
  },
  skeletonPoster: {
    aspectRatio: 9 / 16,
    backgroundColor: colors.border,
    borderRadius: 8,
    width: "100%",
  },
  thumbnail: {
    height: "100%",
    width: "100%",
  },
  thumbnailFallback: {
    alignItems: "center",
    backgroundColor: colors.text,
    flex: 1,
    justifyContent: "center",
  },
  thumbnailFrame: {
    aspectRatio: 9 / 16,
    backgroundColor: colors.text,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  thumbnailShade: {
    backgroundColor: "rgba(0, 0, 0, 0.12)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  viewerScreen: { backgroundColor: colors.reelBackground },
});
