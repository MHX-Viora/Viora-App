import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getConversationLinks } from "@/services/chat.service";
import { colors, spacing } from "@/theme";
import type { ChatSharedLink } from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";

const PAGE_SIZE = 30;

const normalizeConversationId = (value: string) =>
  value.replace(/-(attachments|links|report|search)(?:-|$).*/, "");

const normalizeUrl = (url: string) => {
  const value = url.trim();
  if (!value) return "";
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
};

const openLink = async (url: string) => {
  const targetUrl = normalizeUrl(url);
  if (!targetUrl) {
    Alert.alert("Không thể mở liên kết", "Liên kết không hợp lệ.");
    return;
  }

  try {
    await WebBrowser.openBrowserAsync(targetUrl);
  } catch (browserError) {
    try {
      await Linking.openURL(targetUrl);
    } catch {
      Alert.alert(
        "Không thể mở liên kết",
        browserError instanceof Error ? browserError.message : "Vui lòng thử lại.",
      );
    }
  }
};

export function ConversationLinksScreen() {
  const insets = useSafeAreaInsets();
  const { conversationId: rawConversationId = "" } =
    useLocalSearchParams<{ conversationId?: string }>();
  const conversationId = normalizeConversationId(rawConversationId);
  const [items, setItems] = useState<ChatSharedLink[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      if (!conversationId) {
        setError("Thiếu mã cuộc trò chuyện.");
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);

      try {
        const result = await getConversationLinks(conversationId, {
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        setItems((current) =>
          nextPage === 1 ? result.items : [...current, ...result.items],
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải liên kết.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [conversationId],
  );

  useEffect(() => {
    void load(1, "initial");
  }, [load]);

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(spacing.xl, insets.top + spacing.md) },
        ]}
      >
        <Pressable
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Liên kết đã chia sẻ</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{error}</Text>
          <Pressable onPress={() => void load(1, "initial")} style={styles.retryButton}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(1, "refresh")}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="link"
              onPress={() => void openLink(item.url)}
              style={styles.row}
            >
              <View style={styles.iconWrap}>
                <Ionicons color={colors.primary} name="link" size={22} />
              </View>
              <View style={styles.textWrap}>
                <Text numberOfLines={2} style={styles.url}>
                  {item.url}
                </Text>
                <Text style={styles.meta}>
                  {item.sender?.displayName ?? "Người dùng"} -{" "}
                  {formatChatTime(item.createdAt)}
                </Text>
              </View>
              <Ionicons color={colors.textMuted} name="open-outline" size={18} />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có liên kết.</Text>}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} /> : null
          }
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
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  center: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl,
  },
  empty: { color: colors.textMuted, padding: spacing.xl, textAlign: "center" },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    padding: spacing.md,
  },
  headerSpacer: { width: 40 },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  textWrap: { flex: 1 },
  url: { color: colors.primary, fontSize: 14, fontWeight: "800" },
});
