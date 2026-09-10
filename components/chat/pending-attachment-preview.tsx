import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { spacing } from "@/theme";
import type { SendMessageAttachment } from "@/types/chat";
import { type ThemeColors, useTheme } from "@/theme";
import { toggleChatAudioPlayback } from "@/utils/chat-audio-playback";


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
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const videoPlayer = useVideoPlayer(
    attachment.kind === "video" ? attachment.uri : null,
  );
  const audioPlayer = useAudioPlayer(
    attachment.kind === "audio" ? attachment.uri : null,
  );
  const status = useAudioPlayerStatus(audioPlayer);
  const audioDuration = status.duration || attachment.duration || 0;
  const activeWaveBars =
    status.playing && audioDuration
      ? Math.max(1, Math.ceil((status.currentTime / audioDuration) * 14))
      : 0;
  const removeButton = (
    <Pressable
      accessibilityLabel="Loại bỏ tệp đã chọn"
      onPress={() => onRemove(attachment.id)}
      style={styles.removeAttachmentButton}
    >
      <Ionicons color={colors.white} name="close" size={12} />
    </Pressable>
  );

  if (attachment.kind === "audio") {
    return (
      <View style={[styles.pendingCard, styles.pendingAudioCard]}>
        <Pressable
          accessibilityLabel={status.playing ? "Tạm dừng ghi âm" : "Nghe lại ghi âm"}
          accessibilityRole="button"
          onPress={() =>
            void toggleChatAudioPlayback({
              player: audioPlayer,
              preparePlayback: () =>
                setAudioModeAsync({
                  allowsRecording: false,
                  playsInSilentMode: true,
                }),
              status,
            }).catch(() =>
              Alert.alert("Không thể phát âm thanh", "Vui lòng thử lại."),
            )
          }
          style={styles.audioPlayButton}
        >
          <Ionicons
            color={colors.primaryContrast}
            name={status.playing ? "pause" : "play"}
            size={18}
          />
        </Pressable>
        <View style={styles.pendingCardBody}>
          <View style={styles.pendingWaveform}>
            {Array.from({ length: 14 }).map((_, index) => (
              <View
                key={`${attachment.id}-pending-wave-${index}`}
                style={[
                  styles.pendingWaveBar,
                  status.playing &&
                    index < activeWaveBars &&
                    styles.pendingWaveBarActive,
                  { height: 6 + ((index * 5) % 14) },
                ]}
              />
            ))}
          </View>
          <Text style={styles.pendingCardMeta}>
            {audioDuration ? `${Math.max(1, Math.round(audioDuration))}s` : "Âm thanh"}
          </Text>
        </View>
        {removeButton}
      </View>
    );
  }

  if (attachment.kind === "file") {
    return (
      <View style={[styles.pendingCard, styles.pendingFileCard]}>
        <View style={styles.pendingFileIcon}>
          <Ionicons color={colors.primary} name="document-text-outline" size={24} />
        </View>
        <View style={styles.pendingCardBody}>
          <Text numberOfLines={1} style={styles.pendingFileName}>
            {attachment.name}
          </Text>
          <Text style={styles.pendingCardMeta}>Tài liệu</Text>
        </View>
        {removeButton}
      </View>
    );
  }

  const label =
    attachment.kind === "image"
      ? "Ảnh"
      : "Video";

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
      ) : null}
      <Text numberOfLines={1} style={styles.attachmentPreviewName}>
        {label}
      </Text>
      {removeButton}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  audioPlayButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
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
    backgroundColor: colors.visuals.rgb_0_0_0_0_38,
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    left: 19,
    position: "absolute",
    top: 19,
    width: 26,
  },
  attachmentThumbVideo: { height: "100%", width: "100%" },
  pendingAudioCard: { minWidth: 230 },
  pendingCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginRight: spacing.sm,
    minHeight: 72,
    padding: spacing.sm,
    position: "relative",
  },
  pendingCardBody: { flex: 1, gap: spacing.xs, minWidth: 0 },
  pendingCardMeta: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  pendingFileCard: { minWidth: 260 },
  pendingFileIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  pendingFileName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  pendingWaveBar: {
    backgroundColor: colors.textMuted,
    borderRadius: 999,
    width: 3,
  },
  pendingWaveBarActive: { backgroundColor: colors.primary },
  pendingWaveform: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    height: 22,
  },
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
