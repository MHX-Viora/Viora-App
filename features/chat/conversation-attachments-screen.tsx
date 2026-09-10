import Ionicons from "@expo/vector-icons/Ionicons";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppToast } from "@/components/common/app-toast";
import { downloadChatAttachment } from "@/services/chat-attachment-download.service";
import { getConversationAttachments } from "@/services/chat.service";
import { spacing } from "@/theme";
import type { ChatSharedAttachment } from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";
import { toggleChatAudioPlayback } from "@/utils/chat-audio-playback";
import { type ThemeColors, useTheme } from "@/theme";


const PAGE_SIZE = 30;
const normalizeConversationId = (value: string) =>
  value.replace(/-(attachments|links|report|search)(?:-|$).*/, "");

const TABS = [
  { icon: "image-outline", label: "Ảnh", type: 1 },
  { icon: "videocam-outline", label: "Video", type: 2 },
  { icon: "document-text-outline", label: "File", type: 3 },
  { icon: "mic-outline", label: "Âm thanh", type: 4 },
] as const;

const sortByNewest = (items: ChatSharedAttachment[]) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return (Number.isFinite(rightTime) ? rightTime : 0) -
      (Number.isFinite(leftTime) ? leftTime : 0);
  });

const getVideoThumbnailUrl = (item: ChatSharedAttachment) => {
  if (item.thumbnailUrl) return item.thumbnailUrl;
  if (!item.url.includes("/video/upload/")) return "";
  return item.url
    .replace("/video/upload/", "/video/upload/so_1/")
    .replace(/\.[^/.?]+(\?.*)?$/, ".jpg$1");
};

const openAttachment = async (item: ChatSharedAttachment) => {
  try {
    const canOpen = await Linking.canOpenURL(item.url);
    if (!canOpen) {
      Alert.alert("Không thể mở tệp", "Thiết bị không hỗ trợ mở tệp này.");
      return;
    }
    await Linking.openURL(item.url);
  } catch (error) {
    Alert.alert(
      "Không thể mở tệp",
      error instanceof Error ? error.message : "Vui lòng thử lại.",
    );
  }
};

function MediaViewer({
  item,
  onClose,
}: {
  item: ChatSharedAttachment | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const player = useVideoPlayer(item?.type === "video" ? item.url : null);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent={false}
      visible={item !== null}
    >
      <View style={styles.viewer}>
        <Pressable
          accessibilityLabel="Đóng trình xem"
          onPress={onClose}
          style={styles.viewerClose}
        >
          <Ionicons color={colors.white} name="close" size={26} />
        </Pressable>
        {item?.type === "image" ? (
          <Image resizeMode="contain" source={{ uri: item.url }} style={styles.viewerMedia} />
        ) : item?.type === "video" ? (
          <VideoView
            contentFit="contain"
            nativeControls
            player={player}
            style={styles.viewerVideo}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function DownloadOverlay() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View pointerEvents="none" style={styles.downloadOverlay}>
      <ActivityIndicator color={colors.white} size="small" />
      <Text style={styles.downloadOverlayText}>Đang tải xuống...</Text>
    </View>
  );
}

function AudioRow({
  isDownloading,
  item,
  onLongPress,
}: {
  isDownloading: boolean;
  item: ChatSharedAttachment;
  onLongPress: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const player = useAudioPlayer(item.url);
  const status = useAudioPlayerStatus(player);
  const durationLabel = status.duration
    ? `${Math.max(1, Math.round(status.duration))}s`
    : "Âm thanh";
  const activeWaveBars =
    status.playing && status.duration
      ? Math.max(1, Math.ceil((status.currentTime / status.duration) * 18))
      : 0;

  return (
    <Pressable
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={() =>
        void toggleChatAudioPlayback({
          player,
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
      style={styles.fileRow}
    >
      <View style={styles.fileIcon}>
        <Ionicons
          color={colors.primary}
          name={status.playing ? "pause-circle" : "play-circle"}
          size={26}
        />
      </View>
      <View style={styles.audioBody}>
        <Text numberOfLines={1} style={styles.fileName}>
          {item.name}
        </Text>
        <View style={styles.waveform}>
          {Array.from({ length: 18 }).map((_, index) => (
            <View
              key={`${item.id}-${index}`}
              style={[
                styles.waveBar,
                status.playing &&
                  index < activeWaveBars &&
                  styles.activeWaveBar,
                { height: 5 + ((index * 5) % 14) },
              ]}
            />
          ))}
        </View>
        <Text style={styles.fileMeta}>
          {durationLabel} - {formatChatTime(item.createdAt)}
        </Text>
      </View>
      {isDownloading ? <DownloadOverlay /> : null}
    </Pressable>
  );
}

export function ConversationAttachmentsScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { conversationId: rawConversationId = "", type: initialType = "1" } =
    useLocalSearchParams<{ conversationId?: string; type?: string }>();
  const conversationId = normalizeConversationId(rawConversationId);
  const [type, setType] = useState(() => {
    const parsed = Number(initialType);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4 ? parsed : 1;
  });
  const [items, setItems] = useState<ChatSharedAttachment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [viewingItem, setViewingItem] = useState<ChatSharedAttachment | null>(null);
  const [selectedItem, setSelectedItem] = useState<ChatSharedAttachment | null>(null);
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      if (!conversationId) return;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);
      try {
        const result = await getConversationAttachments(conversationId, {
          page: nextPage,
          pageSize: PAGE_SIZE,
          type,
        });
        setItems((current) =>
          sortByNewest(
            nextPage === 1 ? result.items : [...current, ...result.items],
          ),
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Không thể tải tệp.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [conversationId, type],
  );

  useEffect(() => {
    void load(1, "initial");
  }, [load]);

  const isMediaTab = type === 1 || type === 2;

  const downloadSelectedItem = useCallback(async () => {
    if (!selectedItem || downloadingItemId === selectedItem.id) return;
    const item = selectedItem;
    setDownloadingItemId(item.id);
    setSelectedItem(null);
    try {
      const result = await downloadChatAttachment(item);
      showAppToast({
        message: `Đã tải ${result.fileName}`,
        type: "success",
      });
    } catch (downloadError) {
      showAppToast({
        message: downloadError instanceof Error
          ? downloadError.message
          : "Không thể tải tệp. Vui lòng thử lại.",
        type: "error",
      });
    } finally {
      setDownloadingItemId(null);
    }
  }, [downloadingItemId, selectedItem]);

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(spacing.xl, insets.top + spacing.md) },
        ]}
      >
        <Text style={styles.headerTitle}>Nội dung đã chia sẻ</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            accessibilityRole="button"
            key={tab.type}
            onPress={() => setType(tab.type)}
            style={[styles.tab, type === tab.type && styles.activeTab]}
          >
            <Ionicons
              color={
                type === tab.type ? colors.primaryContrast : colors.textMuted
              }
              name={tab.icon}
              size={16}
            />
            <Text style={[styles.tabText, type === tab.type && styles.activeTabText]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.list,
            items.length === 0 && styles.emptyList,
          ]}
          data={items}
          key={isMediaTab ? "media" : "list"}
          keyExtractor={(item) => item.id}
          numColumns={isMediaTab ? 3 : 1}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(1, "refresh")}
            />
          }
          renderItem={({ item }) =>
            item.type === "image" || item.type === "video" ? (
              <Pressable
                accessibilityRole="imagebutton"
                onLongPress={() => setSelectedItem(item)}
                onPress={() => setViewingItem(item)}
                style={styles.mediaTile}
              >
                {item.type === "image" ? (
                  <Image source={{ uri: item.url }} style={styles.mediaImage} />
                ) : getVideoThumbnailUrl(item) ? (
                  <Image
                    source={{ uri: getVideoThumbnailUrl(item) }}
                    style={styles.mediaImage}
                  />
                ) : (
                  <View style={[styles.mediaImage, styles.videoFallback]}>
                    <Ionicons color={colors.white} name="videocam" size={28} />
                  </View>
                )}
                {item.type === "video" ? (
                  <View style={styles.playBadge}>
                    <Ionicons color={colors.white} name="play" size={18} />
                  </View>
                ) : null}
                {downloadingItemId === item.id ? <DownloadOverlay /> : null}
              </Pressable>
            ) : item.type === "audio" ? (
              <AudioRow
                isDownloading={downloadingItemId === item.id}
                item={item}
                onLongPress={() => setSelectedItem(item)}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                onLongPress={() => setSelectedItem(item)}
                onPress={() => void openAttachment(item)}
                style={styles.fileRow}
              >
                <View style={styles.fileIcon}>
                  <Ionicons
                    color={colors.primary}
                    name="document-text"
                    size={22}
                  />
                </View>
                <View style={styles.fileText}>
                  <Text numberOfLines={1} style={styles.fileName}>
                    {item.name}
                  </Text>
                  <Text style={styles.fileMeta}>
                    Tệp - {formatChatTime(item.createdAt)}
                  </Text>
                </View>
                <Ionicons color={colors.textMuted} name="open-outline" size={18} />
                {downloadingItemId === item.id ? <DownloadOverlay /> : null}
              </Pressable>
            )
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có nội dung.</Text>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} /> : null
          }
          onEndReached={() => {
            if (loadingMore || page >= totalPages) return;
            void load(page + 1, "more");
          }}
        />
      )}

      <MediaViewer item={viewingItem} onClose={() => setViewingItem(null)} />
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
        transparent
        visible={selectedItem !== null}
      >
        <Pressable
          accessibilityLabel="Đóng tùy chọn tệp"
          onPress={() => setSelectedItem(null)}
          style={styles.actionBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.actionSheet, { paddingBottom: Math.max(spacing.lg, insets.bottom) }]}
          >
            <View style={styles.actionHandle} />
            <Text numberOfLines={1} style={styles.actionTitle}>
              {selectedItem?.name || "Tệp đính kèm"}
            </Text>
            <Pressable
              accessibilityLabel="Tải xuống"
              accessibilityRole="button"
              disabled={downloadingItemId !== null}
              onPress={() => void downloadSelectedItem()}
              style={styles.downloadAction}
            >
              {downloadingItemId ? (
                <ActivityIndicator color={colors.primaryContrast} size="small" />
              ) : (
                <Ionicons color={colors.primaryContrast} name="download-outline" size={20} />
              )}
              <Text style={styles.downloadActionText}>
                {downloadingItemId ? "Đang tải..." : "Tải xuống"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  actionBackdrop: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_0_0_0_0_48,
    flex: 1,
    justifyContent: "flex-end",
  },
  actionHandle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 4,
    marginBottom: spacing.md,
    width: 42,
  },
  actionSheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxWidth: 480,
    padding: spacing.lg,
    width: "100%",
  },
  actionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  activeWaveBar: { backgroundColor: colors.danger },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  activeTabText: { color: colors.primaryContrast },
  audioBody: { flex: 1, gap: 5 },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  emptyText: { color: colors.textMuted, padding: spacing.xl, textAlign: "center" },
  downloadAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  downloadActionText: {
    color: colors.primaryContrast,
    fontSize: 15,
    fontWeight: "900",
  },
  downloadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_0_0_0_0_48,
    borderRadius: 8,
    gap: spacing.xs,
    justifyContent: "center",
    zIndex: 2,
  },
  downloadOverlayText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  fileIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  fileMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  fileName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  fileRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.visuals.rgb_152_80_232_0_56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    position: "relative",
  },
  fileText: { flex: 1 },
  header: {
    backgroundColor: colors.visuals.rgb_10_23_41_0_94,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  list: { padding: spacing.md },
  mediaImage: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: "100%",
    width: "100%",
  },
  mediaTile: { aspectRatio: 1, flex: 1 / 3, padding: 3 },
  playBadge: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_0_0_0_0_48,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    left: "50%",
    marginLeft: -17,
    marginTop: -17,
    position: "absolute",
    top: "50%",
    width: 34,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  tab: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: "800" },
  tabs: {
    backgroundColor: colors.background,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  videoFallback: {
    alignItems: "center",
    backgroundColor: colors.textMuted,
    justifyContent: "center",
  },
  viewer: {
    alignItems: "center",
    backgroundColor: colors.background,
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
  viewerMedia: { height: "100%", width: "100%" },
  viewerVideo: {
    height: "86%",
    marginBottom: spacing.xl,
    width: "100%",
  },
  waveBar: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    width: 3,
  },
  waveform: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    height: 22,
  },
});
