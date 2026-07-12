import Ionicons from "@expo/vector-icons/Ionicons";
import { useEvent } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, spacing } from "@/theme";
import type { Reel } from "@/types/reel";

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

function ReelAction({
  icon,
  label,
  onPress,
  selected,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  selected?: boolean;
  value?: string;
}) {
  return (
    <View style={styles.actionGroup}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={styles.circleAction}
      >
        <Ionicons
          color={selected ? colors.primary : colors.white}
          name={icon}
          size={27}
        />
      </Pressable>
      {value && <Text style={styles.actionValue}>{value}</Text>}
    </View>
  );
}

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function ReelCard({
  active,
  height,
  onInteractionLockChange,
  reel,
}: {
  active: boolean;
  height: number;
  onInteractionLockChange?: (locked: boolean) => void;
  reel: Reel;
}) {
  const wasActive = useRef(false);
  const detailsTranslateY = useRef(new Animated.Value(420)).current;
  const [isMuted, setIsMuted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [seekWidth, setSeekWidth] = useState(0);
  const [seekingTime, setSeekingTime] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const player = useVideoPlayer(reel.videoUrl, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = false;
    videoPlayer.timeUpdateEventInterval = 0.25;
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });
  const { currentTime } = useEvent(player, "timeUpdate", {
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    currentTime: player.currentTime,
  });

  useEffect(() => {
    if (active && !wasActive.current) {
      player.currentTime = 0;
      player.muted = false;
      setIsMuted(false);
      player.play();
    } else if (!active) {
      player.pause();
      player.currentTime = 0;
      player.muted = false;
      player.playbackRate = 1;
      setIsMuted(false);
      setPlaybackRate(1);
      setSeekingTime(null);
      setShowControls(false);
      setShowDetails(false);
    }
    wasActive.current = active;
  }, [active, player]);

  useEffect(() => {
    onInteractionLockChange?.(showControls || showDetails);
    return () => onInteractionLockChange?.(false);
  }, [onInteractionLockChange, showControls, showDetails]);

  useEffect(() => {
    if (!active || isPlaying || status !== "readyToPlay" || showControls) {
      setShowPlayButton(false);
      return;
    }
    const timer = setTimeout(() => setShowPlayButton(true), 500);
    return () => clearTimeout(timer);
  }, [active, isPlaying, showControls, status]);

  const duration = player.duration || 0;
  const displayedTime = seekingTime ?? currentTime;
  const progress = duration > 0 ? Math.min(displayedTime / duration, 1) : 0;

  const getSeekTime = (event: GestureResponderEvent) => {
    if (seekWidth <= 0 || duration <= 0) return null;
    const ratio = Math.max(
      0,
      Math.min(event.nativeEvent.locationX / seekWidth, 1),
    );
    return ratio * duration;
  };

  const previewSeek = (event: GestureResponderEvent) => {
    const nextTime = getSeekTime(event);
    if (nextTime !== null) setSeekingTime(nextTime);
  };

  const commitSeek = (event: GestureResponderEvent) => {
    const nextTime = getSeekTime(event) ?? seekingTime;
    if (nextTime !== null) player.currentTime = nextTime;
    setSeekingTime(null);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    player.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const changePlaybackRate = (rate: number) => {
    player.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const openDetails = () => {
    setShowDetails(true);
    detailsTranslateY.setValue(420);
    Animated.timing(detailsTranslateY, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const closeDetails = () => {
    Animated.timing(detailsTranslateY, {
      duration: 210,
      easing: Easing.in(Easing.cubic),
      toValue: 420,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowDetails(false);
    });
  };

  return (
    <View style={[styles.background, { height }]}>
      <VideoView
        contentFit="contain"
        nativeControls={false}
        player={player}
        style={StyleSheet.absoluteFill}
        surfaceType="textureView"
      />
      <View style={styles.tint} />
      <Pressable
        accessibilityHint="Nhấn giữ để mở điều khiển video"
        accessibilityLabel="Video của reel"
        delayLongPress={450}
        onLongPress={() => setShowControls(true)}
        style={styles.videoGestureArea}
      />

      {status === "error" && (
        <View style={styles.centerState}>
          <Ionicons
            color={colors.white}
            name="alert-circle-outline"
            size={36}
          />
          <Text style={styles.stateText}>Không tải được video</Text>
        </View>
      )}
      {showPlayButton && (
        <Pressable
          accessibilityLabel="Phát video"
          accessibilityRole="button"
          onPress={() => player.play()}
          style={styles.playButton}
        >
          <Ionicons color={colors.white} name="play" size={34} />
        </Pressable>
      )}

      <View style={styles.safeContent} pointerEvents="box-none">
        <View pointerEvents="box-none" style={styles.bottomContent}>
          <View style={styles.copy}>
            <Text style={styles.author}>{reel.author}</Text>
            <Text numberOfLines={2} style={styles.caption}>
              {reel.caption}
            </Text>
            <Text numberOfLines={1} style={styles.hashtags}>
              {reel.hashtags}
            </Text>
            {(reel.caption.length > 70 || reel.hashtags.length > 45) && (
              <Pressable
                accessibilityLabel="Xem đầy đủ mô tả và hashtag"
                accessibilityRole="button"
                onPress={openDetails}
              >
                <Text style={styles.moreText}>Xem thêm</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.rail}>
            <View style={styles.avatarWrap}>
              <Image
                accessibilityLabel={`Ảnh đại diện của ${reel.author}`}
                source={reel.avatar}
                style={styles.avatar}
              />
              <View style={styles.follow}>
                <Ionicons color={colors.white} name="add" size={14} />
              </View>
            </View>
            <ReelAction icon="heart" label="Thích reels" value={reel.likes} />
            <ReelAction
              icon="chatbubble"
              label="Bình luận reels"
              value={reel.comments}
            />
            <ReelAction icon="paper-plane-outline" label="Chia sẻ reels" />
            <ReelAction
              icon={isSaved ? "bookmark" : "bookmark-outline"}
              label={isSaved ? "Bỏ lưu reels" : "Lưu reels"}
              onPress={() => setIsSaved((saved) => !saved)}
              selected={isSaved}
            />
          </View>
        </View>
      </View>

      {showControls && (
        <View style={styles.controlsBackdrop}>
          <Pressable
            accessibilityLabel="Đóng cài đặt video"
            accessibilityRole="button"
            onPress={() => setShowControls(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityLabel="Điều khiển video"
            accessibilityViewIsModal
            style={styles.controlsPanel}
          >
            <View style={styles.controlsHeader}>
              <Text style={styles.controlsTitle}>Cài đặt video</Text>
              <Pressable
                accessibilityLabel="Đóng cài đặt video"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setShowControls(false)}
              >
                <Ionicons color={colors.white} name="close" size={26} />
              </Pressable>
            </View>

            <View style={styles.seekRow}>
              <Text style={styles.timeText}>{formatTime(displayedTime)}</Text>
              <View
                accessibilityLabel="Tua video"
                accessibilityRole="adjustable"
                onLayout={(event: LayoutChangeEvent) =>
                  setSeekWidth(event.nativeEvent.layout.width)
                }
                onMoveShouldSetResponder={() => true}
                onResponderGrant={previewSeek}
                onResponderMove={previewSeek}
                onResponderRelease={commitSeek}
                onResponderTerminate={commitSeek}
                onResponderTerminationRequest={() => false}
                onStartShouldSetResponder={() => true}
                style={styles.seekTrack}
              >
                <View pointerEvents="none" style={styles.seekRail} />
                <View
                  pointerEvents="none"
                  style={[styles.seekProgress, { width: `${progress * 100}%` }]}
                />
                <View
                  pointerEvents="none"
                  style={[styles.seekThumb, { left: `${progress * 100}%` }]}
                />
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.utilityRow}>
              <Pressable
                accessibilityLabel={isPlaying ? "Tạm dừng video" : "Phát video"}
                accessibilityRole="button"
                onPress={() => (isPlaying ? player.pause() : player.play())}
                style={styles.utilityButton}
              >
                <Ionicons
                  color={colors.white}
                  name={isPlaying ? "pause" : "play"}
                  size={22}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                accessibilityRole="button"
                onPress={toggleMute}
                style={styles.utilityButton}
              >
                <Ionicons
                  color={colors.white}
                  name={isMuted ? "volume-mute" : "volume-high"}
                  size={22}
                />
              </Pressable>
            </View>

            <Text style={styles.speedLabel}>Tốc độ phát</Text>
            <View style={styles.speedRow}>
              {PLAYBACK_RATES.map((rate) => (
                <Pressable
                  accessibilityLabel={`Tốc độ ${rate} lần`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: playbackRate === rate }}
                  key={rate}
                  onPress={() => changePlaybackRate(rate)}
                  style={[
                    styles.speedButton,
                    playbackRate === rate && styles.speedButtonActive,
                  ]}
                >
                  <Text style={styles.speedText}>{rate}×</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      {showDetails && (
        <View style={styles.detailsBackdrop}>
          <Pressable
            accessibilityLabel="Đóng chi tiết video"
            accessibilityRole="button"
            onPress={closeDetails}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            accessibilityLabel="Chi tiết video"
            style={[
              styles.detailsSheet,
              { transform: [{ translateY: detailsTranslateY }] },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Mô tả</Text>
              <Pressable
                accessibilityLabel="Đóng chi tiết video"
                accessibilityRole="button"
                hitSlop={10}
                onPress={closeDetails}
              >
                <Ionicons color={colors.white} name="close" size={26} />
              </Pressable>
            </View>
            <Text style={styles.detailsAuthor}>{reel.author}</Text>
            <Text style={styles.detailsCaption}>{reel.caption}</Text>
            <Text style={styles.detailsHashtags}>{reel.hashtags}</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionGroup: { alignItems: "center", gap: 0 },
  actionValue: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
    marginTop: -1,
  },
  author: { color: colors.white, fontSize: 18, fontWeight: "800" },
  avatar: {
    borderColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    width: 48,
  },
  avatarWrap: { marginBottom: spacing.sm },
  background: {
    backgroundColor: colors.reelBackground,
    overflow: "hidden",
    width: "100%",
  },
  bottomContent: {
    alignItems: "flex-end",
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
  },
  caption: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  centerState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
  },
  circleAction: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  controlsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.34)",
    justifyContent: "flex-end",
    padding: spacing.md,
    zIndex: 5,
  },
  controlsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  controlsPanel: {
    backgroundColor: "rgba(20,26,34,0.96)",
    borderRadius: 16,
    padding: spacing.md,
  },
  controlsTitle: { color: colors.white, fontSize: 17, fontWeight: "700" },
  copy: { flex: 1, paddingBottom: spacing.xs, paddingRight: spacing.md },
  follow: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    bottom: -6,
    height: 20,
    justifyContent: "center",
    left: 14,
    position: "absolute",
    width: 20,
  },
  detailsAuthor: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  detailsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    zIndex: 6,
  },
  detailsCaption: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  detailsHashtags: {
    color: "#61D3F2",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  detailsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailsSheet: {
    backgroundColor: "#151B23",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "72%",
    minHeight: 280,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  detailsTitle: { color: colors.white, fontSize: 17, fontWeight: "700" },
  hashtags: {
    color: "#61D3F2",
    fontSize: 14,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  moreText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  playButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    position: "absolute",
    top: "44%",
    width: 68,
    zIndex: 3,
  },
  rail: { alignItems: "center", gap: spacing.sm, width: 52 },
  safeContent: { flex: 1, paddingBottom: 10, zIndex: 2 },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.32)",
    borderRadius: 2,
    height: 4,
    marginBottom: spacing.sm,
    width: 40,
  },
  seekProgress: {
    backgroundColor: colors.primary,
    borderRadius: 2,
    height: 4,
    left: 0,
    position: "absolute",
    top: 12,
  },
  seekRail: {
    backgroundColor: "rgba(255,255,255,0.32)",
    borderRadius: 2,
    height: 4,
    left: 0,
    position: "absolute",
    right: 0,
    top: 12,
  },
  seekRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  seekThumb: {
    backgroundColor: colors.white,
    borderRadius: 7,
    height: 14,
    marginLeft: -7,
    position: "absolute",
    top: 7,
    width: 14,
  },
  seekTrack: { flex: 1, height: 28, justifyContent: "center" },
  speedButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  speedButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speedLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  speedRow: { flexDirection: "row", gap: spacing.sm },
  speedText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  stateText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  timeText: { color: colors.white, fontSize: 12, minWidth: 34 },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.reelOverlay,
  },
  utilityButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  utilityRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  videoGestureArea: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
});
