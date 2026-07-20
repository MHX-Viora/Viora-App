import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppToast } from "@/components/common/app-toast";
import {
  createPrivateConversation,
  forwardChatMessage,
  getConversations,
} from "@/services/chat.service";
import { getSelectableFriends } from "@/services/friend.service";
import { colors, spacing } from "@/theme";
import type { Conversation } from "@/types/chat";
import type { SelectableFriend } from "@/types/chat-group";

const PAGE_SIZE = 20;

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const getTitle = (conversation: Conversation) =>
  conversation.conversationType === "Private"
    ? (conversation.otherParticipant?.displayName ?? conversation.name)
    : conversation.name;

const getAvatar = (conversation: Conversation) =>
  conversation.conversationType === "Private"
    ? (conversation.otherParticipant?.avatarUrl ?? conversation.avatarUrl)
    : conversation.avatarUrl;

const mergeConversations = (
  current: Conversation[],
  incoming: Conversation[],
) => {
  const seen = new Set(current.map((item) => item.id));
  return current.concat(incoming.filter((item) => !seen.has(item.id)));
};

const mergeFriends = (
  current: SelectableFriend[],
  incoming: SelectableFriend[],
) => {
  const seen = new Set(current.map((item) => item.id));
  return current.concat(incoming.filter((item) => !seen.has(item.id)));
};

type ForwardTarget =
  | { id: string; kind: "friend"; friend: SelectableFriend }
  | { id: string; kind: "group"; conversation: Conversation };

function ForwardTargetRow({
  target,
  isSelected,
  onToggle,
}: {
  target: ForwardTarget;
  isSelected: boolean;
  onToggle: (targetId: string) => void;
}) {
  const isGroup = target.kind === "group";
  const title = isGroup
    ? getTitle(target.conversation)
    : target.friend.displayName;
  const avatar = isGroup ? getAvatar(target.conversation) : target.friend.avatarUrl;
  const isVerified = !isGroup && target.friend.isVerified;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={() => onToggle(target.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons
            color={colors.primary}
            name={isGroup ? "people" : "person"}
            size={22}
          />
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {isVerified ? (
            <Ionicons color={colors.primary} name="checkmark-circle" size={16} />
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.subtitle}>
          {isGroup ? "Nhóm" : "Bạn bè"}
        </Text>
      </View>
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected ? (
          <Ionicons color={colors.white} name="checkmark" size={17} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function ForwardMessageScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ messageId?: string | string[] }>();
  const messageId = firstParam(params.messageId);
  const [friends, setFriends] = useState<SelectableFriend[]>([]);
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const load = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);
      try {
        const [friendResult, conversationResult] = await Promise.all([
          getSelectableFriends({
            keyword: debouncedKeyword,
            page: nextPage,
            pageSize: PAGE_SIZE,
          }),
          getConversations({
            keyword: debouncedKeyword,
            page: nextPage,
            pageSize: PAGE_SIZE,
          }),
        ]);
        const nextGroups = conversationResult.items.filter(
          (item) => item.conversationType === "Group",
        );
        setFriends((current) =>
          nextPage === 1
            ? friendResult.items
            : mergeFriends(current, friendResult.items),
        );
        setGroups((current) =>
          nextPage === 1 ? nextGroups : mergeConversations(current, nextGroups),
        );
        setPage(Math.max(friendResult.page, conversationResult.page));
        setTotalPages(
          Math.max(friendResult.totalPages, conversationResult.totalPages),
        );
      } catch (error) {
        Alert.alert(
          "Không thể tải danh sách",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedKeyword],
  );

  useEffect(() => {
    void load(1, "initial");
  }, [load]);

  const selectedCount = selectedIds.size;
  const canSend = messageId.length > 0 && selectedCount > 0 && !sending;

  const targets = useMemo<ForwardTarget[]>(
    () => [
      ...friends.map((friend) => ({
        friend,
        id: `friend:${friend.id}`,
        kind: "friend" as const,
      })),
      ...groups.map((conversation) => ({
        conversation,
        id: `group:${conversation.id}`,
        kind: "group" as const,
      })),
    ],
    [friends, groups],
  );

  const toggle = useCallback((targetId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const selectedTargets = targets.filter((target) =>
        selectedIds.has(target.id),
      );
      const friendConversationIds = await Promise.all(
        selectedTargets
          .filter((target) => target.kind === "friend")
          .map((target) => createPrivateConversation(target.friend.id)),
      );
      const groupConversationIds = selectedTargets
        .filter((target) => target.kind === "group")
        .map((target) => target.conversation.id);
      await forwardChatMessage(messageId, [
        ...new Set([...friendConversationIds, ...groupConversationIds]),
      ]);
      showAppToast({ message: "Đã chuyển tiếp thành công", type: "success" });
      router.back();
    } catch (error) {
      Alert.alert(
        "Không thể chuyển tiếp",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setSending(false);
    }
  }, [canSend, messageId, selectedIds, targets]);

  const emptyText = useMemo(
    () => (keyword.trim() ? "Không tìm thấy cuộc trò chuyện." : "Chưa có cuộc trò chuyện."),
    [keyword],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Chuyển tiếp</Text>
        <Pressable
          accessibilityLabel="Gửi tin nhắn chuyển tiếp"
          disabled={!canSend}
          onPress={handleSend}
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.sendText}>Gửi</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons color={colors.textMuted} name="search" size={18} />
        <TextInput
          onChangeText={setKeyword}
          placeholder="Tìm cuộc trò chuyện hoặc bạn bè..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={keyword}
        />
      </View>

      {selectedCount > 0 ? (
        <Text style={styles.selectedText}>Đã chọn {selectedCount} cuộc trò chuyện</Text>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          data={targets}
          extraData={selectedIds}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={styles.footerLoader} />
            ) : null
          }
          onEndReached={() => {
            if (!loadingMore && page < totalPages) void load(page + 1, "more");
          }}
          onEndReachedThreshold={0.5}
          onRefresh={() => load(1, "refresh")}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <ForwardTargetRow
              target={item}
              isSelected={selectedIds.has(item.id)}
              onToggle={toggle}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 24, height: 48, width: 48 },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  checkbox: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  container: { backgroundColor: colors.white, flex: 1 },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    paddingTop: spacing.xl,
    textAlign: "center",
  },
  footerLoader: { paddingVertical: spacing.md },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowPressed: { opacity: 0.75 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: spacing.sm,
  },
  selectedText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    minHeight: 38,
    minWidth: 64,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  sendButtonDisabled: { opacity: 0.45 },
  sendText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  title: { color: colors.text, fontSize: 16, fontWeight: "900" },
  titleLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
});
