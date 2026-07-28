import Ionicons from "@expo/vector-icons/Ionicons";
import { useEvent } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState, useMemo } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { showAppToast } from "@/components/common/app-toast";
import { ReelAction } from "@/components/reels/reel-action";
import {
  REEL_PLAYBACK_RATES,
  REEL_REPORT_REASONS,
  REEL_VIDEO_TOP_OFFSET,
  REEL_VIDEO_VERTICAL_SHIFT,
} from "@/constants/reels";
import { deletePost, reportPost } from "@/services/post.service";
import { followUser } from "@/services/user.service";
import { spacing } from "@/theme";
import type { Reel } from "@/types/reel";
import { formatReelTime } from "@/utils/reel-time";
import { type ThemeColors, useTheme } from "@/theme";


export function ReelCard({
  active,
  height,
  onComment,
  onDelete,
  onOpenAuthor,
  onReact,
  onInteractionLockChange,
  onSave,
  onShare,
  reel,
  safeBottomInset = 0,
  videoTopOffset = REEL_VIDEO_TOP_OFFSET,
}: {
  active: boolean;
  height: number;
  onComment?: (reelId: string) => void;
  onDelete?: (reelId: string) => void;
  onOpenAuthor?: (userId: string) => void;
  onReact?: (reelId: string) => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onSave?: (reelId: string) => void;
  onShare?: (reel: Reel) => void;
  reel: Reel;
  safeBottomInset?: number;
  videoTopOffset?: number;
}) {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const wasActive = useRef(false);
  const detailsTranslateY = useRef(new Animated.Value(420)).current;
  const [isMuted, setIsMuted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(reel.isFollowing);
  const [isFollowingAuthorBusy, setIsFollowingAuthorBusy] = useState(false);
  const [showFollowSuccess, setShowFollowSuccess] = useState(false);
  const [reportingReason, setReportingReason] = useState<number | null>(null);
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
    setIsFollowingAuthor(reel.isFollowing);
  }, [reel.id, reel.isFollowing]);

  useEffect(() => {
    if (!showFollowSuccess) return;
    const timer = setTimeout(() => setShowFollowSuccess(false), 2000);
    return () => clearTimeout(timer);
  }, [showFollowSuccess]);

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

  const deleteReel = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await deletePost(reel.id);
      setShowControls(false);
      onDelete?.(reel.id);
    } catch (error) {
      Alert.alert(
        "Không thể xóa video",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    if (isDeleting) return;

    Alert.alert(
      "Xóa video?",
      "Video này sẽ bị xóa khỏi Viora. Bạn có chắc muốn tiếp tục không?",
      [
        { style: "cancel", text: "Hủy" },
        {
          onPress: deleteReel,
          style: "destructive",
          text: "Xóa",
        },
      ],
    );
  };

  const openReport = () => {
    setShowControls(false);
    setReportVisible(true);
  };

  const handleDownload = async () => {
    try {
      await WebBrowser.openBrowserAsync(reel.videoUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch (error) {
      Alert.alert(
        "Không thể tải video",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  const handleFollowAuthor = async () => {
    if (!reel.authorId || isFollowingAuthorBusy) return;

    setIsFollowingAuthorBusy(true);
    try {
      const result = await followUser(reel.authorId);
      setIsFollowingAuthor(result.isFollowing);
      if (result.isFollowing) setShowFollowSuccess(true);
      showAppToast({
        message: result.isFollowing
          ? "Bạn đã theo dõi người dùng này."
          : "Bạn đã bỏ theo dõi người dùng này.",
        title: result.isFollowing ? "Đã theo dõi" : "Đã bỏ theo dõi",
        type: "success",
      });
    } catch (error) {
      Alert.alert(
        "Không thể theo dõi",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setIsFollowingAuthorBusy(false);
    }
  };

  const handleReport = async (reason: (typeof REEL_REPORT_REASONS)[number]) => {
    if (reportingReason !== null) return;

    setReportingReason(reason.value);
    try {
      await reportPost({
        description: reason.description,
        postId: reel.id,
        reason: reason.value,
      });
      setReportVisible(false);
      showAppToast({
        message: "Cảm ơn bạn đã giúp Viora an toàn hơn.",
        title: "Đã gửi báo cáo",
        type: "success",
      });
    } catch (error) {
      Alert.alert(
        "Không thể báo cáo",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setReportingReason(null);
    }
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
      <View style={[styles.videoLayer, { top: videoTopOffset }]}>
        {reel.thumbnailUrl ? (
          <Image
            blurRadius={28}
            contentFit="cover"
            pointerEvents="none"
            source={{ uri: reel.thumbnailUrl }}
            style={styles.videoBackdrop}
          />
        ) : null}
        <View style={styles.videoFrame}>
          <VideoView
            contentFit="contain"
            nativeControls={false}
            player={player}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.tint} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.topMask, { height: videoTopOffset }]}
      />
      <Pressable
        accessibilityHint="Nhấn giữ để mở điều khiển video"
        accessibilityLabel="Video cá»§a reel"
        delayLongPress={450}
        onLongPress={() => setShowControls(true)}
        style={[styles.videoGestureArea, { top: videoTopOffset }]}
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

      <View
        style={[
          styles.safeContent,
          { paddingBottom: Math.max(spacing.md, safeBottomInset + spacing.md) },
        ]}
        pointerEvents="box-none"
      >
        <View pointerEvents="box-none" style={styles.bottomContent}>
          <View style={styles.copy}>
            <View style={styles.authorLine}>
              <Pressable
                accessibilityRole="button"
                disabled={!reel.authorId || !onOpenAuthor}
                onPress={() => reel.authorId && onOpenAuthor?.(reel.authorId)}
                style={styles.authorPressable}
              >
                <Text numberOfLines={1} style={styles.author}>
                  {reel.author}
                </Text>
              </Pressable>
              {reel.isAuthorVerified && (
                <Ionicons
                  accessibilityLabel="Tài khoản đã xác minh"
                  color={colors.verified}
                  name="checkmark-circle"
                  size={16}
                />
              )}
            </View>
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
              <Pressable
                accessibilityRole="button"
                disabled={!reel.authorId || !onOpenAuthor}
                onPress={() => reel.authorId && onOpenAuthor?.(reel.authorId)}
              >
                <Image
                  accessibilityLabel={`Ảnh đại diện của ${reel.author}`}
                  source={reel.avatar}
                  style={styles.avatar}
                />
              </Pressable>
              {!isFollowingAuthor && !reel.isMine && (
                <Pressable
                  accessibilityLabel="Theo dõi người đăng"
                  accessibilityRole="button"
                  disabled={isFollowingAuthorBusy}
                  onPress={handleFollowAuthor}
                  style={styles.follow}
                >
                  {isFollowingAuthorBusy ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Ionicons color={colors.white} name="add" size={14} />
                  )}
                </Pressable>
              )}
              {showFollowSuccess && (
                <View style={styles.followSuccess}>
                  <Ionicons color={colors.white} name="checkmark" size={16} />
                </View>
              )}
            </View>
            <ReelAction
              icon="heart"
              label="Thích reels"
              onPress={() => onReact?.(reel.id)}
              selected={reel.isReacted}
              value={reel.likes}
            />
            <ReelAction
              icon="chatbubble"
              label="Bình luận reels"
              onPress={() => onComment?.(reel.id)}
              value={reel.comments}
            />
            <ReelAction
              icon="paper-plane-outline"
              label="Chia sẻ reels"
              onPress={() => onShare?.(reel)}
            />
            <ReelAction
              icon={reel.isSaved ? "bookmark" : "bookmark-outline"}
              label={reel.isSaved ? "Bỏ lưu reels" : "Lưu reels"}
              onPress={() => onSave?.(reel.id)}
              selected={reel.isSaved}
            />
          </View>
        </View>
      </View>

      {showControls && (
        <View
          style={[
            styles.controlsBackdrop,
            { paddingBottom: safeBottomInset + spacing.md },
          ]}
        >
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
            <View style={styles.moderationGroup}>
              <Pressable onPress={openReport} style={styles.moderationAction}>
                <Ionicons color={colors.white} name="flag-outline" size={21} />
                <Text style={styles.moderationText}>Báo cáo video</Text>
              </Pressable>
              <Pressable
                onPress={handleDownload}
                style={styles.moderationAction}
              >
                <Ionicons
                  color={colors.white}
                  name="download-outline"
                  size={21}
                />
                <Text style={styles.moderationText}>Tải xuống video</Text>
              </Pressable>
              {reel.isMine && (
                <Pressable
                  disabled={isDeleting}
                  onPress={handleDelete}
                  style={styles.moderationAction}
                >
                  {isDeleting ? (
                    <ActivityIndicator color={colors.danger} size="small" />
                  ) : (
                    <Ionicons
                      color={colors.danger}
                      name="trash-outline"
                      size={21}
                    />
                  )}
                  <Text style={[styles.moderationText, styles.deleteText]}>
                    Xóa video
                  </Text>
                </Pressable>
              )}
            </View>
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
              <Text style={styles.timeText}>{formatReelTime(displayedTime)}</Text>
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
              <Text style={styles.timeText}>{formatReelTime(duration)}</Text>
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
              {REEL_PLAYBACK_RATES.map((rate) => (
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
              {
                marginBottom: safeBottomInset,
                transform: [{ translateY: detailsTranslateY }],
              },
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
      <Modal
        animationType="slide"
        onRequestClose={() => setReportVisible(false)}
        transparent
        visible={reportVisible}
      >
        <Pressable
          onPress={() => setReportVisible(false)}
          style={styles.reportBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.reportSheet}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.reportSheetTitle}>Báo cáo video</Text>
            {REEL_REPORT_REASONS.map((reason) => (
              <Pressable
                disabled={reportingReason !== null}
                key={reason.value}
                onPress={() => handleReport(reason)}
                style={styles.reportReason}
              >
                <View>
                  <Text style={styles.reportTitle}>{reason.label}</Text>
                  <Text style={styles.reportDescription}>
                    {reason.description}
                  </Text>
                </View>
                {reportingReason === reason.value ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Ionicons
                    color={colors.textMuted}
                    name="chevron-forward"
                    size={20}
                  />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  author: { color: colors.white, fontSize: 18, fontWeight: "800" },
  authorLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  authorPressable: { flexShrink: 1 },
  avatar: {
    borderColor: colors.primary,
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
  controlsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.visuals.rgb_0_0_0_0_34,
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
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
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
  followSuccess: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 14,
    bottom: -8,
    height: 28,
    justifyContent: "center",
    left: 10,
    position: "absolute",
    width: 28,
  },
  detailsAuthor: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  detailsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.visuals.rgb_0_0_0_0_45,
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
    color: colors.primary,
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxHeight: "72%",
    minHeight: 280,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  detailsTitle: { color: colors.white, fontSize: 17, fontWeight: "700" },
  deleteText: { color: colors.danger },
  hashtags: {
    color: colors.primary,
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
  moderationAction: {
    alignItems: "center",
    borderTopColor: colors.visuals.rgb_255_255_255_0_12,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 50,
  },
  moderationGroup: {
    borderBottomColor: colors.visuals.rgb_255_255_255_0_16,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
  },
  moderationText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  playButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 34,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    position: "absolute",
    top: "44%",
    width: 68,
    zIndex: 3,
  },
  rail: { alignItems: "center", gap: spacing.sm, width: 60 },
  reportBackdrop: {
    backgroundColor: colors.visuals.rgb_0_0_0_0_42,
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 10,
  },
  reportDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  reportReason: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingVertical: spacing.sm,
  },
  reportSheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  reportSheetTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    paddingBottom: spacing.md,
  },
  reportTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  safeContent: { flex: 1, zIndex: 2 },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: colors.visuals.rgb_255_255_255_0_32,
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
    backgroundColor: colors.visuals.rgb_255_255_255_0_32,
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
    borderColor: colors.visuals.rgb_255_255_255_0_24,
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
    backgroundColor: colors.visuals.rgb_2_12_24_0_12,
  },
  topMask: {
    backgroundColor: colors.reelBackground,
    height: REEL_VIDEO_TOP_OFFSET,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  utilityButton: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_255_255_255_0_12,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  utilityRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  videoGestureArea: {
    ...StyleSheet.absoluteFillObject,
    top: REEL_VIDEO_TOP_OFFSET,
    transform: [{ translateY: REEL_VIDEO_VERTICAL_SHIFT }],
    zIndex: 1,
  },
  videoLayer: {
    alignItems: "center",
    backgroundColor: colors.reelBackground,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: REEL_VIDEO_TOP_OFFSET,
    transform: [{ translateY: REEL_VIDEO_VERTICAL_SHIFT }],
  },
  videoFrame: {
    backgroundColor: "transparent",
    height: "100%",
    overflow: "hidden",
    width: "100%",
  },
  videoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.48,
    transform: [{ scale: 1.08 }],
  },
});
