import Ionicons from "@expo/vector-icons/Ionicons";
import { useEvent } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";
import type { Reel } from "@/types/reel";

function ReelAction({
  icon,
  label,
  onPress,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  value?: string;
}) {
  return (
    <View style={styles.actionGroup}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.circleAction}
      >
        <Ionicons color={colors.white} name={icon} size={27} />
      </Pressable>
      {value && <Text style={styles.actionValue}>{value}</Text>}
    </View>
  );
}

export function ReelCard({
  active,
  height,
  reel,
}: {
  active: boolean;
  height: number;
  reel: Reel;
}) {
  const [showPlayButton, setShowPlayButton] = useState(false);
  const player = useVideoPlayer(reel.videoUrl, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = false;
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  useEffect(() => {
    if (!active || isPlaying || status !== "readyToPlay") {
      setShowPlayButton(false);
      return;
    }
    const timer = setTimeout(() => setShowPlayButton(true), 500);
    return () => clearTimeout(timer);
  }, [active, isPlaying, status]);

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
      {status === "loading" && (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>Đang tải video…</Text>
        </View>
      )}
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
      <View style={styles.safeContent}>
        <View style={styles.bottomContent}>
          <View style={styles.copy}>
            <Text style={styles.author}>{reel.author}</Text>
            <Text numberOfLines={2} style={styles.caption}>
              {reel.caption}
            </Text>
            <Text style={styles.hashtags}>{reel.hashtags}</Text>
            {/* <Text style={styles.sourceSize}>Nguồn {reel.sourceSize}</Text> */}
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
            <ReelAction icon="share-social" label="Chia sẻ reels" />
            {/* <ReelAction
              icon={isMuted ? "volume-mute" : "volume-high"}
              label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              onPress={() => setIsMuted((muted) => !muted)}
            /> */}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionGroup: { alignItems: "center", gap: 3 },
  actionValue: { color: colors.white, fontSize: 14, fontWeight: "700" },
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
    backgroundColor: "rgba(28,38,50,0.12)",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
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
  hashtags: {
    color: "#61D3F2",
    fontSize: 14,
    fontWeight: "600",
    marginTop: spacing.xs,
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
  rail: { alignItems: "center", gap: spacing.md, width: 52 },
  safeContent: { flex: 1, paddingBottom: 10 },
  sourceSize: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.48)",
    borderRadius: 5,
    color: colors.white,
    fontSize: 13,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stateText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.reelOverlay,
  },
});
