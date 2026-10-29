import Ionicons from "@expo/vector-icons/Ionicons";
import {
  CameraView,
  type CameraType,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { useVideoPlayer, VideoView } from "expo-video";
import type React from "react";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getResponsiveDialogLayout } from "@/components/layout/responsive-layout";
import { useResponsive } from "@/hooks/use-responsive";
import { HashtagPicker } from "@/components/common/hashtag-picker";
import { normalizeHashtag, dedupeHashtags } from "@/utils/hashtag-selection";
import { spacing } from "@/theme";
import type { Hashtag } from "@/types/reel";
import { type ThemeColors, useTheme } from "@/theme";
import { playVideoPreview } from "@/utils/video-preview-playback";


export type SelectedVideo = {
  duration: number | null;
  name: string;
  type?: string;
  uri: string;
};

export function CreateReelModal({
  isSubmitting = false,
  onClose,
  onPickVideo,
  onRecordVideo,
  onSubmit,
  selectedVideo,
  visible,
}: {
  isSubmitting?: boolean;
  onClose: () => void;
  onPickVideo: () => void;
  onRecordVideo: (video: SelectedVideo) => void;
  onSubmit: (caption: string, hashtags: string[]) => void;
  selectedVideo: SelectedVideo | null;
  visible: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isDesktopWeb } = useResponsive();
  const dialogLayout = getResponsiveDialogLayout({
    isDesktopWeb,
    maxWidth: 720,
  });
  const [caption, setCaption] = useState("");
  const [hashtagQuery, setHashtagQuery] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<Hashtag[]>([]);
  const [step, setStep] = useState<"select" | "details">("select");

  useEffect(() => {
    if (!visible) {
      setCaption("");
      setHashtagQuery("");
      setSelectedHashtags([]);
      setStep("select");
    }
  }, [visible]);

  const submit = () => {
    const typedHashtag = normalizeHashtag(hashtagQuery);
    const typedHashtagItem = typedHashtag
      ? { id: `custom-${typedHashtag}`, name: typedHashtag, postCount: 0 }
      : null;
    const hashtags = typedHashtagItem
      ? [...selectedHashtags, typedHashtagItem]
      : selectedHashtags;

    onSubmit(
      caption.trim(),
      dedupeHashtags(hashtags.map((tag) => tag.name)),
    );
  };

  return (
    <Modal
      animationType={isDesktopWeb ? "fade" : "slide"}
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
      transparent={isDesktopWeb}
      visible={visible}
    >
      <View
        style={[
          styles.workflowBackdrop,
          isDesktopWeb && styles.desktopWorkflowBackdrop,
          dialogLayout.backdrop,
        ]}
      >
        <View
          style={[
            styles.workflowSurface,
            dialogLayout.surface,
            isDesktopWeb && styles.desktopWorkflowSurface,
          ]}
        >
          {step === "select" ? (
            <VideoSelectionStep
              onClose={onClose}
              onNext={() => setStep("details")}
              onPickVideo={onPickVideo}
              onRecordVideo={onRecordVideo}
              selectedVideo={selectedVideo}
            />
          ) : (
            <VideoDetailsStep
              caption={caption}
              hashtagQuery={hashtagQuery}
              isSubmitting={isSubmitting}
              onBack={() => setStep("select")}
              onCaptionChange={setCaption}
              onHashtagQueryChange={setHashtagQuery}
              onPickVideo={onPickVideo}
              onSelectedHashtagsChange={setSelectedHashtags}
              onSubmit={submit}
              selectedHashtags={selectedHashtags}
              selectedVideo={selectedVideo}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function VideoSelectionStep({
  onClose,
  onNext,
  onPickVideo,
  onRecordVideo,
  selectedVideo,
}: {
  onClose: () => void;
  onNext: () => void;
  onPickVideo: () => void;
  onRecordVideo: (video: SelectedVideo) => void;
  selectedVideo: SelectedVideo | null;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [previewDuration, setPreviewDuration] = useState<{ uri: string; duration: number } | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cameraRef.current?.stopRecording();
    },
    [],
  );

  const requestRecordingPermissions = async () => {
    const camera = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    const microphone = microphonePermission?.granted
      ? microphonePermission
      : await requestMicrophonePermission();
    const granted = camera.granted && microphone.granted;
    if (!granted) {
      Alert.alert(
        "Cần quyền camera và micro",
        "Hãy cấp quyền để ANKT có thể quay video kèm âm thanh.",
      );
    }
    return granted;
  };

  const recordVideo = async () => {
    if (!cameraRef.current || !isCameraReady || isRecording) return;

    setIsRecording(true);
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 180 });
      if (result?.uri) {
        onRecordVideo({
          duration: null,
          name: `viora-${Date.now()}.mp4`,
          type: "video/mp4",
          uri: result.uri,
        });
      }
    } catch (error) {
      Alert.alert(
        "Không thể quay video",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    if (!(await requestRecordingPermissions())) return;
    if (timerSeconds === 0) {
      await recordVideo();
      return;
    }

    setCountdown(timerSeconds);
    timerRef.current = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          void recordVideo();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const toggleRecording = () => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      return;
    }
    void startRecording();
  };

  const cycleTimer = () =>
    setTimerSeconds((current) => (current === 0 ? 3 : current === 3 ? 10 : 0));

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.cameraScreen}>
      <View style={styles.cameraHeader}>
        <Pressable
          accessibilityLabel="Đóng trang tạo video"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={styles.roundButton}
        >
          <Ionicons color={colors.text} name="close" size={26} />
        </Pressable>
        <View style={styles.soundPill}>
          <Ionicons color={colors.text} name="musical-notes" size={15} />
          <Text style={styles.soundText}>Thêm âm thanh</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.previewStage}>
        {selectedVideo ? (
          <SelectedVideoPreview
            key={selectedVideo.uri}
            onLoadedDuration={(duration) => setPreviewDuration({ uri: selectedVideo.uri, duration })}
            video={selectedVideo}
          />
        ) : cameraPermission?.granted && microphonePermission?.granted ? (
          <CameraView
            enableTorch={torchEnabled && facing === "back"}
            facing={facing}
            mode="video"
            onCameraReady={() => setIsCameraReady(true)}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Pressable
            accessibilityLabel="Cho phép camera và micro"
            accessibilityRole="button"
            onPress={() => void requestRecordingPermissions()}
            style={styles.emptyPreview}
          >
            <Ionicons
              color={colors.textMuted}
              name="videocam-outline"
              size={54}
            />
            <Text style={styles.emptyTitle}>Tạo video của bạn</Text>
            <Text style={styles.emptyText}>Chọn video có sẵn để bắt đầu</Text>
          </Pressable>
        )}
        {!selectedVideo &&
          cameraPermission?.granted &&
          microphonePermission?.granted && (
          <View style={styles.cameraTools}>
            <CameraTool
              disabled={isRecording || countdown > 0}
              icon="camera-reverse-outline"
              label="Đổi camera"
              onPress={() => {
                setIsCameraReady(false);
                setFacing((current) => (current === "back" ? "front" : "back"));
              }}
            />
            <CameraTool
              active={torchEnabled}
              disabled={facing === "front" || isRecording || countdown > 0}
              icon={torchEnabled ? "flash" : "flash-off-outline"}
              label="Đèn"
              onPress={() => setTorchEnabled((current) => !current)}
            />
            <CameraTool
              active={timerSeconds > 0}
              disabled={isRecording || countdown > 0}
              icon="timer-outline"
              label={timerSeconds === 0 ? "Hẹn giờ" : `${timerSeconds}s`}
              onPress={cycleTimer}
            />
          </View>
          )}
        {countdown > 0 && <Text style={styles.countdown}>{countdown}</Text>}
        {selectedVideo && (
          <View style={styles.selectedBadge}>
            <Ionicons color={colors.text} name="checkmark" size={15} />
            <Text style={styles.selectedText}>
              {formatDuration(previewDuration?.uri === selectedVideo.uri ? previewDuration.duration : selectedVideo.duration)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.durationRow}>
        <Text style={styles.durationMuted}>15 giây</Text>
        <Text style={styles.durationActive}>60 giây</Text>
        <Text style={styles.durationMuted}>3 phút</Text>
      </View>
      <View style={styles.captureRow}>
        <Pressable
          accessibilityLabel="Chọn video từ thư viện"
          accessibilityRole="button"
          onPress={onPickVideo}
          style={styles.sideAction}
        >
          <View style={styles.galleryIcon}>
            <Ionicons color={colors.text} name="images" size={22} />
          </View>
          <Text style={styles.sideLabel}>Tải lên</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={isRecording ? "Dừng quay video" : "Quay video"}
          accessibilityRole="button"
          accessibilityState={{ disabled: Boolean(selectedVideo) || countdown > 0 }}
          disabled={Boolean(selectedVideo) || countdown > 0}
          onPress={toggleRecording}
          style={({ pressed }) => [
            styles.captureOuter,
            isRecording && styles.captureOuterActive,
            (Boolean(selectedVideo) || countdown > 0) && styles.disabled,
            pressed && { opacity: 0.8 },
          ]}
        >
          <View
            style={[
              styles.captureInner,
              isRecording && styles.captureInnerRecording,
            ]}
          >
            {!isRecording && <Ionicons color={colors.primaryContrast} name="videocam" size={28} />}
          </View>
        </Pressable>
        <Pressable
          accessibilityLabel="Tiếp tục chỉnh sửa bài đăng"
          accessibilityRole="button"
          disabled={!selectedVideo}
          onPress={onNext}
          style={styles.sideAction}
        >
          <View style={[styles.nextIcon, !selectedVideo && styles.disabled]}>
            <Ionicons color={colors.primaryContrast} name="chevron-forward" size={24} />
          </View>
          <Text style={[styles.sideLabel, !selectedVideo && styles.mutedLabel]}>
            Tiếp
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CameraTool({
  active = false,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.cameraTool,
        active && styles.cameraToolActive,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons
        color={active ? colors.primary : colors.text}
        name={icon}
        size={22}
      />
      <Text style={styles.cameraToolText}>{label}</Text>
    </Pressable>
  );
}

function SelectedVideoPreview(props: { video: SelectedVideo; onLoadedDuration: (duration: number) => void }) {
  return Platform.OS === "web" ? <WebSelectedVideoPreview {...props} /> : <NativeSelectedVideoPreview {...props} />;
}

function WebSelectedVideoPreview({ video, onLoadedDuration }: { video: SelectedVideo; onLoadedDuration: (duration: number) => void }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    let disposed = false;
    void playVideoPreview(element).catch(() => {
      if (!disposed) setIsPlaying(false);
    });
    return () => {
      disposed = true;
      element.pause();
    };
  }, [video.uri]);

  const resumePlayback = () => {
    const element = videoRef.current;
    if (element) void element.play().catch(() => setIsPlaying(false));
  };

  return <>
    <video
      autoPlay
      loop
      playsInline
      preload="auto"
      ref={videoRef}
      src={video.uri}
      onLoadedMetadata={(event) => {
        const duration = event.currentTarget.duration;
        if (Number.isFinite(duration) && duration > 0) onLoadedDuration(duration * 1000);
      }}
      onPlaying={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onError={() => setHasError(true)}
      onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', objectFit: 'contain', backgroundColor: colors.reelBackground }}
    />
    {!isPlaying && <Pressable
      accessibilityLabel={hasError ? "Không thể phát video này" : "Phát video xem trước"}
      accessibilityRole="button"
      disabled={hasError}
      onPress={resumePlayback}
      style={styles.previewPlaybackButton}
    >
      <Ionicons color={colors.text} name={hasError ? "alert-circle-outline" : "play"} size={30} />
      {hasError && <Text style={styles.sideLabel}>Không thể phát video này</Text>}
    </Pressable>}
    <Pressable
      accessibilityLabel={isMuted ? "Bật âm thanh video" : "Tắt âm thanh video"}
      accessibilityRole="button"
      onPress={() => {
        const element = videoRef.current;
        if (!element) return;
        element.muted = !element.muted;
        setIsMuted(element.muted);
        resumePlayback();
      }}
      style={styles.previewSoundButton}
    >
      <Ionicons color={colors.text} name={isMuted ? "volume-mute" : "volume-high"} size={22} />
    </Pressable>
  </>;
}

function NativeSelectedVideoPreview({ video, onLoadedDuration }: { video: SelectedVideo; onLoadedDuration: (duration: number) => void }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isMuted, setIsMuted] = useState(false);
  const player = useVideoPlayer(video.uri, (instance) => {
    instance.loop = true;
    instance.muted = false;
    instance.play();
  });

  const toggleSound = () => {
    const nextMuted = !isMuted;
    player.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <>
      <VideoView
        contentFit="contain"
        nativeControls={false}
        onFirstFrameRender={() => {
          if (Number.isFinite(player.duration) && player.duration > 0) onLoadedDuration(player.duration * 1000);
        }}
        player={player}
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.reelBackground }]}
      />
      <Pressable
        accessibilityLabel={isMuted ? "Bật âm thanh video" : "Tắt âm thanh video"}
        accessibilityRole="button"
        onPress={toggleSound}
        style={styles.previewSoundButton}
      >
        <Ionicons
          color={colors.text}
          name={isMuted ? "volume-mute" : "volume-high"}
          size={22}
        />
      </Pressable>
    </>
  );
}

function VideoDetailsStep({
  caption,
  hashtagQuery,
  isSubmitting,
  onBack,
  onCaptionChange,
  onHashtagQueryChange,
  onPickVideo,
  onSelectedHashtagsChange,
  onSubmit,
  selectedHashtags,
  selectedVideo,
}: {
  caption: string;
  hashtagQuery: string;
  isSubmitting: boolean;
  onBack: () => void;
  onCaptionChange: (value: string) => void;
  onHashtagQueryChange: (value: string) => void;
  onPickVideo: () => void;
  onSelectedHashtagsChange: (value: Hashtag[]) => void;
  onSubmit: () => void;
  selectedHashtags: Hashtag[];
  selectedVideo: SelectedVideo | null;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView edges={["top"]} style={styles.detailsScreen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.detailsScreen}
      >
        <View style={styles.detailsHeader}>
          <Pressable
            accessibilityLabel="Quay lại chọn video"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={styles.headerButton}
          >
            <Ionicons color={colors.text} name="arrow-back" size={25} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.detailsTitle}>
            Đăng video
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.formContent}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityLabel="Thay video đã chọn"
            accessibilityRole="button"
            onPress={onPickVideo}
            style={styles.videoSummary}
          >
            <View style={styles.summaryIcon}>
              <Ionicons color={colors.text} name="play" size={22} />
            </View>
            <View style={styles.summaryCopy}>
              <Text numberOfLines={1} style={styles.summaryName}>
                {selectedVideo?.name}
              </Text>
              <Text style={styles.summaryMeta}>
                {formatDuration(selectedVideo?.duration ?? null)} · Nhấn để thay đổi
              </Text>
            </View>
            <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
          </Pressable>

          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            accessibilityLabel="Mô tả video"
            maxLength={500}
            multiline
            onChangeText={onCaptionChange}
            placeholder="Mô tả video của bạn..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.captionInput]}
            textAlignVertical="top"
            value={caption}
          />
          <Text style={styles.counter}>{caption.length}/500</Text>

          <HashtagPicker query={hashtagQuery} onQueryChange={onHashtagQueryChange} selected={selectedHashtags} onChange={onSelectedHashtagsChange} />
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={!selectedVideo || isSubmitting}
            onPress={onSubmit}
            style={[
              styles.publishButton,
              (!selectedVideo || isSubmitting) && styles.publishButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryContrast} size="small" />
            ) : (
              <Ionicons color={colors.primaryContrast} name="paper-plane" size={18} />
            )}
            <Text style={styles.publishText}>
              {isSubmitting ? "Đang đăng..." : "Đăng video"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {isSubmitting && (
        <View
          accessibilityLabel="Đang đăng video"
          accessibilityViewIsModal
          style={styles.submittingOverlay}
        >
          <View style={styles.submittingPanel}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.submittingTitle}>Đang đăng video</Text>
            <Text style={styles.submittingText}>
              Vui lòng chờ phản hồi, không thoát khỏi màn hình này.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function formatDuration(duration: number | null) {
  if (!duration) return "Video đã chọn";
  const seconds = Math.round(duration / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  desktopWorkflowBackdrop: {
    backgroundColor: colors.visuals.rgb_0_0_0_0_54,
  },
  desktopWorkflowSurface: {
    borderColor: colors.border,
    borderWidth: 1,
    overflow: "hidden",
  },
  cameraScreen: { backgroundColor: colors.surface, flex: 1 },
  cameraHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roundButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  soundPill: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  soundText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  headerSpacer: { width: 44 },
  previewStage: {
    alignSelf: "center",
    aspectRatio: 9 / 16,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    maxHeight: "100%",
    overflow: "hidden",
    width: "96%",
  },
  emptyPreview: { alignItems: "center", flex: 1, justifyContent: "center" },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  selectedBadge: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    position: "absolute",
    top: spacing.md,
  },
  selectedText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  previewSoundButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    width: 40,
  },
  previewPlaybackButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    position: "absolute",
    top: "45%",
  },
  durationRow: {
    flexDirection: "row",
    gap: spacing.xl,
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  durationActive: { color: colors.text, fontSize: 13, fontWeight: "800" },
  durationMuted: { color: colors.textMuted, fontSize: 13 },
  captureRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  sideAction: { alignItems: "center", gap: 6, width: 64 },
  sideLabel: { color: colors.text, fontSize: 12, fontWeight: "600" },
  galleryIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  captureOuter: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: 40,
    borderWidth: 4,
    height: 80,
    justifyContent: "center",
    width: 80,
    shadowColor: colors.glow,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  captureOuterActive: { borderColor: colors.danger },
  captureInner: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  captureInnerRecording: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    height: 34,
    width: 34,
  },
  nextIcon: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
  },
  cameraTools: {
    gap: spacing.sm,
    position: "absolute",
    right: spacing.sm,
    top: spacing.lg,
  },
  cameraTool: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 52,
    width: 56,
  },
  cameraToolActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  cameraToolText: { color: colors.text, fontSize: 9, fontWeight: "700" },
  countdown: {
    alignSelf: "center",
    color: colors.white,
    fontSize: 72,
    fontWeight: "900",
    position: "absolute",
    top: "42%",
  },
  disabled: { opacity: 0.35 },
  mutedLabel: { opacity: 0.4 },
  detailsScreen: { backgroundColor: colors.surface, flex: 1 },
  detailsHeader: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  detailsTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  formContent: { padding: spacing.lg, paddingBottom: 100 },
  videoSummary: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    height: 56,
    justifyContent: "center",
    width: 44,
  },
  summaryCopy: { flex: 1 },
  summaryName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  summaryMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    padding: spacing.md,
  },
  captionInput: { minHeight: 120 },
  counter: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: "right",
  },
  hashtagBox: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  hashtagInput: {
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    padding: spacing.md,
  },
  hashtagChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  hashtagChip: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  hashtagChipText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  suggestions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.xs,
  },
  suggestionState: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  suggestionMuted: { color: colors.textMuted, fontSize: 13 },
  suggestionError: { color: colors.danger, fontSize: 13, padding: spacing.sm },
  suggestionItem: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  suggestionHash: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  suggestionHashText: { color: colors.text, fontSize: 16, fontWeight: "900" },
  suggestionCopy: { flex: 1 },
  suggestionName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  suggestionCount: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  footer: { borderTopColor: colors.border, borderTopWidth: 1, padding: spacing.md },
  publishButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    shadowColor: colors.glow,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 10,
  },
  publishButtonDisabled: { opacity: 0.6 },
  publishText: { color: colors.primaryContrast, fontSize: 16, fontWeight: "800" },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_0_0_0_0_54,
    justifyContent: "center",
    padding: spacing.xl,
    zIndex: 20,
  },
  submittingPanel: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    gap: spacing.sm,
    padding: spacing.lg,
    width: "100%",
  },
  submittingText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  submittingTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  workflowBackdrop: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  workflowSurface: { flex: 1 },
});
