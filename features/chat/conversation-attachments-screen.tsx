import Ionicons from "@expo/vector-icons/Ionicons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
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

import { getConversationAttachments } from "@/services/chat.service";
import { spacing } from "@/theme";
import type { ChatSharedAttachment } from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";
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

function AudioRow({ item }: { item: ChatSharedAttachment }) {
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
      onPress={() => {
        if (status.playing) {
          player.pause();
          return;
        }
        player.play();
      }}
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
              </Pressable>
            ) : item.type === "audio" ? (
              <AudioRow item={item} />
            ) : (
              <Pressable
                accessibilityRole="button"
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
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
