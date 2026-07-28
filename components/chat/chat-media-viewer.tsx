import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image, Modal, Pressable, StyleSheet, View } from "react-native";

import { spacing } from "@/theme";
import type { ChatAttachment } from "@/types/chat";
import { type ThemeColors, useTheme } from "@/theme";


type ChatMediaViewerProps = {
  attachment: ChatAttachment | null;
  onClose: () => void;
};

export function ChatMediaViewer({ attachment, onClose }: ChatMediaViewerProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const videoPlayer = useVideoPlayer(
    attachment?.type === "video" ? attachment.url : null,
    (player) => {
      player.loop = false;
      player.play();
    },
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent={false}
      visible={attachment !== null}
    >
      <View style={styles.viewer}>
        <Pressable
          accessibilityLabel="Đóng trình xem"
          onPress={onClose}
          style={styles.viewerClose}
        >
          <Ionicons color={colors.white} name="close" size={26} />
        </Pressable>
        {attachment?.type === "image" ? (
          <Image
            resizeMode="contain"
            source={{ uri: attachment.url }}
            style={styles.viewerImage}
          />
        ) : attachment?.type === "video" ? (
          <VideoView
            contentFit="contain"
            fullscreenOptions={{ enable: true }}
            nativeControls
            player={videoPlayer}
            style={styles.viewerVideo}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  viewer: {
    alignItems: "center",
    backgroundColor: colors.reelBackground,
    flex: 1,
    justifyContent: "center",
  },
  viewerClose: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_0_0_0_0_45,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    top: spacing.xl,
    width: 44,
    zIndex: 2,
  },
  viewerImage: { height: "100%", width: "100%" },
  viewerVideo: { height: "100%", width: "100%" },
});
