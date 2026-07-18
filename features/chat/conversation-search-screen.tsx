import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { searchConversationMessages } from "@/services/chat.service";
import { colors, spacing } from "@/theme";
import type { ChatSearchResult } from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";

const PAGE_SIZE = 30;
const normalizeConversationId = (value: string) =>
  value.replace(/-(attachments|links|report|search)(?:-|$).*/, "");

export function ConversationSearchScreen() {
  const insets = useSafeAreaInsets();
  const { conversationId: rawConversationId = "" } = useLocalSearchParams<{ conversationId?: string }>();
  const conversationId = normalizeConversationId(rawConversationId);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [items, setItems] = useState<ChatSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const load = useCallback(async (nextPage: number, mode: "initial" | "refresh" | "more") => {
    if (!conversationId || !debouncedKeyword) {
      setItems([]);
      return;
    }
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    if (mode === "more") setLoadingMore(true);
    try {
      const result = await searchConversationMessages(conversationId, {
        keyword: debouncedKeyword,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setItems((current) => (nextPage === 1 ? result.items : [...current, ...result.items]));
      setPage(result.page);
      setTotalPages(result.totalPages);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [conversationId, debouncedKeyword]);

  useEffect(() => { void load(1, "initial"); }, [load]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(spacing.xl, insets.top + spacing.md) }]}>
        <TextInput
          autoFocus
          onChangeText={setKeyword}
          placeholder="Tìm tin nhắn"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={keyword}
        />
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, "refresh")} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: "/chat/[conversationId]",
                  params: { conversationId, scrollToMessageId: item.id },
                })
              }
              style={styles.row}
            >
              <Text numberOfLines={2} style={styles.content}>{item.content || "Tệp đính kèm"}</Text>
              <Text style={styles.meta}>{item.sender?.displayName ?? "Người dùng"} - {formatChatTime(item.createdAt)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{debouncedKeyword ? "Không có kết quả." : "Nhập từ khóa để tìm kiếm."}</Text>}
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
  content: { color: colors.text, fontSize: 15, fontWeight: "800" },
  empty: { color: colors.textMuted, padding: spacing.xl, textAlign: "center" },
  header: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, padding: spacing.md },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  row: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, padding: spacing.md },
  screen: { backgroundColor: colors.background, flex: 1 },
  searchInput: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 8, borderWidth: 1, color: colors.text, fontSize: 15, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
