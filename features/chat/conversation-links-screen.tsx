import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getConversationLinks } from "@/services/chat.service";
import { colors, spacing } from "@/theme";
import type { ChatSharedLink } from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";

const PAGE_SIZE = 30;

export function ConversationLinksScreen() {
  const insets = useSafeAreaInsets();
  const { conversationId = "" } = useLocalSearchParams<{ conversationId?: string }>();
  const [items, setItems] = useState<ChatSharedLink[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (nextPage: number, mode: "initial" | "refresh" | "more") => {
    if (!conversationId) return;
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    if (mode === "more") setLoadingMore(true);
    try {
      const result = await getConversationLinks(conversationId, { page: nextPage, pageSize: PAGE_SIZE });
      setItems((current) => (nextPage === 1 ? result.items : [...current, ...result.items]));
      setPage(result.page);
      setTotalPages(result.totalPages);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [conversationId]);

  useEffect(() => { void load(1, "initial"); }, [load]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(spacing.xl, insets.top + spacing.md) }]}>
        <Text style={styles.headerTitle}>Lien ket da chia se</Text>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, "refresh")} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => void Linking.openURL(item.url)} style={styles.row}>
              <Ionicons color={colors.primary} name="link" size={22} />
              <View style={styles.textWrap}>
                <Text numberOfLines={2} style={styles.url}>{item.url}</Text>
                <Text style={styles.meta}>{item.sender?.displayName ?? "Nguoi dung"} - {formatChatTime(item.createdAt)}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Chua co lien ket.</Text>}
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
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  empty: { color: colors.textMuted, padding: spacing.xl, textAlign: "center" },
  header: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, padding: spacing.md },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  row: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  screen: { backgroundColor: colors.background, flex: 1 },
  textWrap: { flex: 1 },
  url: { color: colors.primary, fontSize: 14, fontWeight: "800" },
});
