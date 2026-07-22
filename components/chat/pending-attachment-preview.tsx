import Ionicons from "@expo/vector-icons/Ionicons";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";
import type { SendMessageAttachment } from "@/types/chat";

type PendingAttachmentPreviewProps = {
  attachment: SendMessageAttachment;
  onOpen: (attachment: SendMessageAttachment) => void;
  onRemove: (id: string) => void;
};

export function PendingAttachmentPreview({
  attachment,
  onOpen,
  onRemove,
}: PendingAttachmentPreviewProps) {
  const videoPlayer = useVideoPlayer(
    attachment.kind === "video" ? attachment.uri : null,
  );
  const label =
    attachment.kind === "image"
      ? "Ảnh"
      : attachment.kind === "video"
        ? "Video"
        : attachment.kind === "audio"
          ? "Âm thanh"
          : "Tài liệu";

  return (
    <View style={styles.attachmentPreview}>
      {attachment.kind === "image" ? (
        <Pressable onPress={() => onOpen(attachment)}>
          <Image
            resizeMode="cover"
            source={{ uri: attachment.uri }}
            style={styles.attachmentThumb}
          />
        </Pressable>
      ) : attachment.kind === "video" ? (
        <Pressable
          onPress={() => onOpen(attachment)}
          style={styles.attachmentThumb}
        >
          <VideoView
            contentFit="cover"
            nativeControls={false}
            player={videoPlayer}
            style={styles.attachmentThumbVideo}
          />
          <View style={styles.attachmentThumbOverlay}>
            <Ionicons color={colors.white} name="play" size={16} />
          </View>
        </Pressable>
      ) : (
        <View style={styles.attachmentIcon}>
          <Ionicons
            color={colors.primary}
            name={attachment.kind === "audio" ? "mic" : "document-attach"}
            size={22}
          />
        </View>
      )}
      <Text numberOfLines={1} style={styles.attachmentPreviewName}>
        {label}
      </Text>
      <Pressable
        accessibilityLabel="Loại bỏ tệp đã chọn"
        onPress={() => onRemove(attachment.id)}
        style={styles.removeAttachmentButton}
      >
        <Ionicons color={colors.white} name="close" size={12} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  attachmentIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 7,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  attachmentPreview: {
    alignItems: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "column",
    gap: spacing.xs,
    marginRight: spacing.sm,
    minHeight: 92,
    padding: spacing.xs,
    position: "relative",
    width: 76,
  },
  attachmentPreviewName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
  },
  attachmentThumb: {
    backgroundColor: colors.border,
    borderRadius: 7,
    height: 64,
    overflow: "hidden",
    width: 64,
  },
  attachmentThumbOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    left: 19,
    position: "absolute",
    top: 19,
    width: 26,
  },
  attachmentThumbVideo: { height: "100%", width: "100%" },
  removeAttachmentButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -6,
    top: -6,
    width: 20,
  },
});
