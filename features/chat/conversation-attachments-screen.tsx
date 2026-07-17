import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getConversationAttachments } from "@/services/chat.service";
import { colors, spacing } from "@/theme";
import type { ChatSharedAttachment } from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";

const PAGE_SIZE = 30;
const TABS = [
  { label: "Tat ca", type: 0 },
  { label: "Anh", type: 1 },
  { label: "Video", type: 2 },
  { label: "File", type: 3 },
  { label: "Ghi am", type: 4 },
];

export function ConversationAttachmentsScreen() {
  const insets = useSafeAreaInsets();
  const { conversationId = "" } = useLocalSearchParams<{ conversationId?: string }>();
  const [type, setType] = useState(0);
  const [items, setItems] = useState<ChatSharedAttachment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

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
        setItems((current) => (nextPage === 1 ? result.items : [...current, ...result.items]));
        setPage(result.page);
        setTotalPages(result.totalPages);
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Khong the tai tep.");
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

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(spacing.xl, insets.top + spacing.md) }]}>
        <Text style={styles.headerTitle}>Anh, video va file</Text>
      </View>
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable key={tab.type} onPress={() => setType(tab.type)} style={[styles.tab, type === tab.type && styles.activeTab]}>
            <Text style={[styles.tabText, type === tab.type && styles.activeTabText]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.emptyText}>{error}</Text></View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={type === 1 || type === 0 ? 3 : 1}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, "refresh")} />}
          renderItem={({ item }) =>
            item.type === "image" || item.type === "video" ? (
              <View style={styles.mediaTile}>
                <Image source={{ uri: item.thumbnailUrl ?? item.url }} style={styles.mediaImage} />
                {item.type === "video" ? <Ionicons color={colors.white} name="play-circle" size={28} style={styles.playIcon} /> : null}
              </View>
            ) : (
              <View style={styles.fileRow}>
                <Ionicons color={colors.primary} name={item.type === "audio" ? "mic" : "document-text"} size={22} />
                <View style={styles.fileText}>
                  <Text numberOfLines={1} style={styles.fileName}>{item.name}</Text>
                  <Text style={styles.fileMeta}>{item.sender?.displayName ?? "Nguoi dung"} - {formatChatTime(item.createdAt)}</Text>
                </View>
              </View>
            )
          }
          ListEmptyComponent={<Text style={styles.emptyText}>Chua co noi dung.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : null}
          onEndReached={() => {
            if (loadingMore || page >= totalPages) return;
            void load(page + 1, "more");
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  activeTab: { backgroundColor: colors.primary },
  activeTabText: { color: colors.white },
  center: { alignItems: "center", flex: 1, justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: "center" },
  fileMeta: { color: colors.textMuted, fontSize: 12 },
  fileName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  fileRow: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  fileText: { flex: 1 },
  header: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, padding: spacing.md },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" },
  list: { padding: spacing.md },
  mediaImage: { backgroundColor: colors.border, borderRadius: 8, height: 112, width: "100%" },
  mediaTile: { aspectRatio: 1, flex: 1 / 3, padding: 3 },
  playIcon: { left: "40%", position: "absolute", top: "38%" },
  screen: { backgroundColor: colors.background, flex: 1 },
  tab: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: "800" },
  tabs: { backgroundColor: colors.surface, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
});
