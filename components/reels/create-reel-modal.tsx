import Ionicons from "@expo/vector-icons/Ionicons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import { searchHashtags } from "@/services/reel.service";
import { colors, spacing } from "@/theme";
import type { Hashtag } from "@/types/reel";

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
  onSubmit,
  selectedVideo,
  visible,
}: {
  isSubmitting?: boolean;
  onClose: () => void;
  onPickVideo: () => void;
  onSubmit: (caption: string, hashtags: string[]) => void;
  selectedVideo: SelectedVideo | null;
  visible: boolean;
}) {
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
      animationType="slide"
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
      visible={visible}
    >
      {step === "select" ? (
        <VideoSelectionStep
          onClose={onClose}
          onNext={() => setStep("details")}
          onPickVideo={onPickVideo}
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
    </Modal>
  );
}

function VideoSelectionStep({
  onClose,
  onNext,
  onPickVideo,
  selectedVideo,
}: {
  onClose: () => void;
  onNext: () => void;
  onPickVideo: () => void;
  selectedVideo: SelectedVideo | null;
}) {
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
          <Ionicons color={colors.white} name="close" size={26} />
        </Pressable>
        <View style={styles.soundPill}>
          <Ionicons color={colors.white} name="musical-notes" size={15} />
          <Text style={styles.soundText}>Thêm âm thanh</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.previewStage}>
        {selectedVideo ? (
          <SelectedVideoPreview video={selectedVideo} />
        ) : (
          <View style={styles.emptyPreview}>
            <Ionicons
              color="rgba(255,255,255,0.7)"
              name="videocam-outline"
              size={54}
            />
            <Text style={styles.emptyTitle}>Tạo video của bạn</Text>
            <Text style={styles.emptyText}>Chọn video có sẵn để bắt đầu</Text>
          </View>
        )}
        {selectedVideo && (
          <View style={styles.selectedBadge}>
            <Ionicons color={colors.white} name="checkmark" size={15} />
            <Text style={styles.selectedText}>
              {formatDuration(selectedVideo.duration)}
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
          accessibilityLabel={selectedVideo ? "Chọn video khác" : "Chọn video"}
          accessibilityRole="button"
          onPress={onPickVideo}
          style={styles.captureOuter}
        >
          <View style={styles.captureInner}>
            <Ionicons color={colors.white} name="add" size={28} />
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
            <Ionicons color={colors.white} name="chevron-forward" size={24} />
          </View>
          <Text style={[styles.sideLabel, !selectedVideo && styles.mutedLabel]}>
            Tiếp
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SelectedVideoPreview({ video }: { video: SelectedVideo }) {
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
        player={player}
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        accessibilityLabel={isMuted ? "Bật âm thanh video" : "Tắt âm thanh video"}
        accessibilityRole="button"
        onPress={toggleSound}
        style={styles.previewSoundButton}
      >
        <Ionicons
          color={colors.white}
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
  const [suggestions, setSuggestions] = useState<Hashtag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [tagError, setTagError] = useState("");
  const keyword = normalizeHashtag(hashtagQuery);
  const shouldShowHashtagSuggestions = keyword.length > 0;

  useEffect(() => {
    let isActive = true;

    if (!shouldShowHashtagSuggestions) {
      setSuggestions([]);
      setIsLoadingTags(false);
      setTagError("");
      return;
    }

    setIsLoadingTags(true);
    setTagError("");
    const timeout = setTimeout(async () => {
      try {
        const tags = await searchHashtags({ keyword, page: 1, pageSize: 8 });
        if (isActive) setSuggestions(tags);
      } catch {
        if (isActive) {
          setSuggestions([]);
          setTagError("Không thể tìm hashtag lúc này.");
        }
      } finally {
        if (isActive) setIsLoadingTags(false);
      }
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [keyword, shouldShowHashtagSuggestions]);

  const addHashtag = (value: string | Hashtag) => {
    const name = normalizeHashtag(typeof value === "string" ? value : value.name);
    if (!name) return;
    const hashtag =
      typeof value === "string"
        ? { id: `custom-${name}`, name, postCount: 0 }
        : { ...value, name };
    const nextHashtags = [...selectedHashtags, hashtag].filter(
      (tag, index, all) =>
        all.findIndex((item) => normalizeHashtag(item.name) === tag.name) ===
        index,
    );

    onSelectedHashtagsChange(nextHashtags);
    onHashtagQueryChange("");
    setSuggestions([]);
  };

  const removeHashtag = (value: string) => {
    onSelectedHashtagsChange(
      selectedHashtags.filter((tag) => normalizeHashtag(tag.name) !== value),
    );
  };

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
              <Ionicons color={colors.white} name="play" size={22} />
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

          <Text style={styles.label}>Hashtag</Text>
          {shouldShowHashtagSuggestions && (
            <View style={styles.suggestions}>
              {isLoadingTags ? (
                <View style={styles.suggestionState}>
                  <ActivityIndicator color="#FE2C55" size="small" />
                  <Text style={styles.suggestionMuted}>Đang tìm hashtag...</Text>
                </View>
              ) : tagError ? (
                <Text style={styles.suggestionError}>{tagError}</Text>
              ) : (
                <>
                  {suggestions.map((tag) => (
                    <Pressable
                      accessibilityLabel={`Chọn hashtag ${tag.name}`}
                      accessibilityRole="button"
                      key={tag.id}
                      onPress={() => addHashtag(tag)}
                      style={styles.suggestionItem}
                    >
                      <View style={styles.suggestionHash}>
                        <Text style={styles.suggestionHashText}>#</Text>
                      </View>
                      <View style={styles.suggestionCopy}>
                        <Text style={styles.suggestionName}>
                          #{tag.name.replace(/^#/, "")}
                        </Text>
                        <Text style={styles.suggestionCount}>
                          {tag.postCount} bài viết
                        </Text>
                      </View>
                      <Ionicons color={colors.textMuted} name="add" size={18} />
                    </Pressable>
                  ))}
                  {!suggestions.some((tag) => normalizeHashtag(tag.name) === keyword) && (
                    <Pressable
                      accessibilityLabel={`Dùng hashtag ${keyword}`}
                      accessibilityRole="button"
                      onPress={() => addHashtag(keyword)}
                      style={styles.suggestionItem}
                    >
                      <View style={styles.suggestionHash}>
                        <Text style={styles.suggestionHashText}>#</Text>
                      </View>
                      <View style={styles.suggestionCopy}>
                        <Text style={styles.suggestionName}>Dùng #{keyword}</Text>
                        <Text style={styles.suggestionCount}>
                          Thêm hashtag này vào video
                        </Text>
                      </View>
                      <Ionicons color={colors.textMuted} name="add" size={18} />
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}
          <View style={styles.hashtagBox}>
            {selectedHashtags.length > 0 && (
              <View style={styles.hashtagChips}>
                {selectedHashtags.map((tag) => (
                  <Pressable
                    accessibilityLabel={`Xóa hashtag ${tag}`}
                    accessibilityRole="button"
                    key={tag.id}
                    onPress={() => removeHashtag(normalizeHashtag(tag.name))}
                    style={styles.hashtagChip}
                  >
                    <Text style={styles.hashtagChipText}>#{tag.name}</Text>
                    <Ionicons color="#175CD3" name="close" size={14} />
                  </Pressable>
                ))}
              </View>
            )}
            <TextInput
              accessibilityLabel="Tìm hashtag video"
              autoCapitalize="none"
              maxLength={80}
              onChangeText={onHashtagQueryChange}
              onSubmitEditing={() => addHashtag(hashtagQuery)}
              placeholder="Tìm hoặc nhập hashtag"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              style={styles.hashtagInput}
              value={hashtagQuery}
            />
          </View>
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
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons color={colors.white} name="paper-plane" size={18} />
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
            <ActivityIndicator color={colors.white} size="large" />
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

function normalizeHashtag(value: string) {
  return value.replace(/^#/, "").trim().replace(/\s+/g, "");
}

function dedupeHashtags(values: string[]) {
  return Array.from(new Set(values.map(normalizeHashtag).filter(Boolean)));
}

function formatDuration(duration: number | null) {
  if (!duration) return "Video đã chọn";
  const seconds = Math.round(duration / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  cameraScreen: { backgroundColor: "#080A0D", flex: 1 },
  cameraHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roundButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.34)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  soundPill: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  soundText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  headerSpacer: { width: 44 },
  previewStage: {
    alignSelf: "center",
    aspectRatio: 9 / 16,
    backgroundColor: "#050505",
    borderRadius: 18,
    flex: 1,
    maxHeight: "100%",
    overflow: "hidden",
    width: "76%",
  },
  emptyPreview: { alignItems: "center", flex: 1, justifyContent: "center" },
  emptyTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  emptyText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: spacing.xs,
  },
  selectedBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
    borderRadius: 14,
    flexDirection: "row",
    gap: 4,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    position: "absolute",
    top: spacing.md,
  },
  selectedText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  previewSoundButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    width: 40,
  },
  durationRow: {
    flexDirection: "row",
    gap: spacing.xl,
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  durationActive: { color: colors.white, fontSize: 13, fontWeight: "800" },
  durationMuted: { color: "rgba(255,255,255,0.48)", fontSize: 13 },
  captureRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  sideAction: { alignItems: "center", gap: 6, width: 64 },
  sideLabel: { color: colors.white, fontSize: 12, fontWeight: "600" },
  galleryIcon: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  captureOuter: {
    alignItems: "center",
    borderColor: colors.white,
    borderRadius: 40,
    borderWidth: 4,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  captureInner: {
    alignItems: "center",
    backgroundColor: "#FE2C55",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  nextIcon: {
    alignItems: "center",
    backgroundColor: "#FE2C55",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
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
    backgroundColor: colors.background,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: colors.reelBackground,
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
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
    backgroundColor: "#EAF2FF",
    borderRadius: 16,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  hashtagChipText: { color: "#175CD3", fontSize: 13, fontWeight: "800" },
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
    backgroundColor: "#F2F4F7",
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
    backgroundColor: "#FE2C55",
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
  },
  publishButtonDisabled: { opacity: 0.6 },
  publishText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.54)",
    justifyContent: "center",
    padding: spacing.xl,
    zIndex: 20,
  },
  submittingPanel: {
    alignItems: "center",
    backgroundColor: "rgba(20,24,31,0.96)",
    borderRadius: 16,
    gap: spacing.sm,
    padding: spacing.lg,
    width: "100%",
  },
  submittingText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  submittingTitle: { color: colors.white, fontSize: 17, fontWeight: "800" },
});
