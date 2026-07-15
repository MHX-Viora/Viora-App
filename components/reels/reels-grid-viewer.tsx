import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ReelCard } from "@/components/reels/reel-card";
import { formatReelCount } from "@/services/reel.service";
import { colors, spacing } from "@/theme";
import type { Reel } from "@/types/reel";

const ITEM_GAP = 1;
const GRID_GAP = 2;
const VIDEO_TILE_WIDTH = (Dimensions.get("window").width - GRID_GAP * 2) / 3;

export function ReelsGridViewer({
  header,
  onComment,
  onCommentCreated,
  onDelete,
  onReact,
  onSave,
  onShare,
  onViewingChange,
  paused,
  reels,
}: {
  header?: React.ReactNode;
  onComment?: (reelId: string) => void;
  onCommentCreated?: { id: string; nonce: number } | null;
  onDelete?: (reelId: string) => void;
  onReact?: (reelId: string) => void;
  onSave?: (reelId: string) => void;
  onShare?: (reel: Reel) => void;
  onViewingChange?: (viewing: boolean) => void;
  paused?: boolean;
  reels: Reel[];
}) {
  const insets = useSafeAreaInsets();
  const viewerListRef = useRef<FlatList<Reel>>(null);
  const [items, setItems] = useState(reels);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerHeight, setViewerHeight] = useState(0);
  const [isViewerLocked, setIsViewerLocked] = useState(false);
  const isViewing = viewerIndex !== null;

  useEffect(() => {
    setItems(reels);
  }, [reels]);

  useEffect(() => {
    onViewingChange?.(isViewing);
    return () => onViewingChange?.(false);
  }, [isViewing, onViewingChange]);

  useEffect(() => {
    if (!onCommentCreated) return;

    setItems((current) =>
      current.map((reel) => {
        if (reel.id !== onCommentCreated.id) return reel;
        const count = Number.parseInt(reel.comments.replace(/\D/g, ""), 10);
        const nextCount = Number.isFinite(count) ? count + 1 : 1;
        return { ...reel, comments: formatReelCount(nextCount) };
      }),
    );
  }, [onCommentCreated]);

  const openViewer = (reel: Reel) => {
    const index = Math.max(
      0,
      items.findIndex((item) => item.id === reel.id),
    );

    setViewerIndex(index);
    requestAnimationFrame(() => {
      viewerListRef.current?.scrollToOffset({
        animated: false,
        offset: (viewerHeight + ITEM_GAP) * index,
      });
    });
  };

  const updateReel = (reelId: string, updater: (reel: Reel) => Reel) => {
    setItems((current) =>
      current.map((reel) => (reel.id === reelId ? updater(reel) : reel)),
    );
  };

  const handleReact = (reelId: string) => {
    updateReel(reelId, (reel) => {
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

  const handleSave = (reelId: string) => {
    updateReel(reelId, (reel) => {
      const nextSaved = !reel.isSaved;
      return {
        ...reel,
        isSaved: nextSaved,
        saveCount: Math.max(0, reel.saveCount + (nextSaved ? 1 : -1)),
      };
    });
    onSave?.(reelId);
  };

  const handleDelete = (reelId: string) => {
    setItems((current) => current.filter((reel) => reel.id !== reelId));
    onDelete?.(reelId);
  };

  const handleViewerLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight !== viewerHeight) setViewerHeight(nextHeight);
  };

  const closeViewer = () => {
    setViewerIndex(null);
    setIsViewerLocked(false);
  };

  return (
    <>
      <View style={styles.videoGrid}>
        {items.map((reel, index) => (
          <Pressable
            accessibilityLabel={`Video của ${reel.author}: ${reel.caption}`}
            accessibilityRole="button"
            key={reel.id}
            onPress={() => openViewer(reel)}
            style={[
              styles.videoTile,
              (index + 1) % 3 !== 0 && styles.videoTileGap,
            ]}
          >
            {reel.thumbnailUrl ? (
              <Image
                accessibilityLabel={`Ảnh bìa video của ${reel.author}`}
                contentFit="cover"
                source={{ uri: reel.thumbnailUrl }}
                style={styles.videoImage}
              />
            ) : (
              <View style={styles.videoFallback}>
                <Ionicons color={colors.white} name="play" size={28} />
              </View>
            )}
            <View style={styles.videoShade} />
            <View style={styles.videoMetric}>
              <Ionicons color={colors.white} name="heart" size={12} />
              <Text style={styles.videoMetricText}>{reel.likes}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Modal
        animationType="slide"
        onRequestClose={closeViewer}
        visible={isViewing}
      >
        <SafeAreaView
          edges={[]}
          onLayout={handleViewerLayout}
          style={styles.viewerScreen}
        >
          <View style={[styles.viewerHeader, { paddingTop: insets.top }]}>
            <Pressable
              accessibilityLabel="Quay lại danh sách video"
              accessibilityRole="button"
              hitSlop={8}
              onPress={closeViewer}
              style={styles.backButton}
            >
              <Ionicons color={colors.white} name="arrow-back" size={24} />
            </Pressable>
            {header}
          </View>
          {viewerHeight > 0 && viewerIndex !== null && (
            <FlatList
              contentContainerStyle={{ rowGap: ITEM_GAP }}
              data={items}
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
                  active={!paused && index === viewerIndex}
                  height={viewerHeight}
                  onComment={onComment}
                  onDelete={handleDelete}
                  onInteractionLockChange={
                    index === viewerIndex ? setIsViewerLocked : undefined
                  }
                  onReact={handleReact}
                  onSave={handleSave}
                  onShare={onShare}
                  reel={item}
                  videoTopOffset={-24}
                />
              )}
              scrollEnabled={!isViewerLocked}
              showsVerticalScrollIndicator={false}
              windowSize={3}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  videoFallback: {
    alignItems: "center",
    backgroundColor: colors.reelBackground,
    flex: 1,
    justifyContent: "center",
  },
  videoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: 2,
  },
  videoImage: { height: "100%", width: "100%" },
  videoMetric: {
    alignItems: "center",
    bottom: 7,
    flexDirection: "row",
    gap: 3,
    left: 7,
    position: "absolute",
  },
  videoMetricText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  videoShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  videoTile: {
    aspectRatio: 9 / 16,
    backgroundColor: colors.reelBackground,
    marginBottom: GRID_GAP,
    overflow: "hidden",
    width: VIDEO_TILE_WIDTH,
  },
  videoTileGap: { marginRight: GRID_GAP },
  viewerHeader: {
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: spacing.sm,
    left: 0,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  viewerScreen: { backgroundColor: colors.reelBackground, flex: 1 },
});
