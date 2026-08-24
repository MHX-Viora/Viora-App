import Ionicons from "@expo/vector-icons/Ionicons";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getSelectableFriends } from "@/services/friend.service";
import { spacing } from "@/theme";
import { VerifiedBadge } from "@/components/common/verified-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import type { SelectableFriend } from "@/types/chat-group";
import { type ThemeColors, useTheme } from "@/theme";


const PAGE_SIZE = 20;
const EMPTY_LOCKED_MEMBERS: SelectableFriend[] = [];

type SelectedMembersState = Record<string, SelectableFriend>;

const mergeFriends = (
  current: SelectableFriend[],
  incoming: SelectableFriend[],
) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
};

function SelectedMember({
  friend,
  locked,
  onRemove,
}: {
  friend: SelectableFriend;
  locked: boolean;
  onRemove: (id: string) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.selectedItem}>
      <View>
        <UserAvatar displayName={friend.displayName} imageUrl={friend.avatarUrl} size={48} style={styles.selectedAvatar} />
        {!locked ? (
          <Pressable
            accessibilityLabel={`Bo chon ${friend.displayName}`}
            accessibilityRole="button"
            onPress={() => onRemove(friend.id)}
            style={styles.removeSelected}
          >
            <Ionicons color={colors.white} name="close" size={12} />
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.selectedName}>
        {friend.displayName}
      </Text>
    </View>
  );
}

const FriendRow = memo(function FriendRow({
  disabledLabel,
  friend,
  isDisabled,
  isLocked,
  isSelected,
  onToggle,
}: {
  disabledLabel: string;
  friend: SelectableFriend;
  isDisabled: boolean;
  isLocked: boolean;
  isSelected: boolean;
  onToggle: (friend: SelectableFriend) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => onToggle(friend)}
      style={({ pressed }) => [
        styles.friendRow,
        isDisabled && styles.friendRowDisabled,
        pressed && styles.pressed,
      ]}
    >
      <UserAvatar displayName={friend.displayName} imageUrl={friend.avatarUrl} size={52} style={styles.friendAvatar} />
      <View style={styles.friendInfo}>
        <View style={styles.nameLine}>
          <Text numberOfLines={1} style={styles.friendName}>
            {friend.displayName}
          </Text>
          {friend.isVerified ? (
            <VerifiedBadge />
          ) : null}
        </View>
        <Text style={styles.statusText}>
          {friend.isOnline ? "Đang hoạt động" : "Hoạt động gần đây"}
        </Text>
      </View>
      {isDisabled && !isSelected ? (
        <Text style={styles.disabledText}>{disabledLabel}</Text>
      ) : (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected ? (
            <Ionicons color={colors.white} name="checkmark" size={15} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
});

export function MemberPicker({
  disabledLabel = "Đã trong nhóm",
  disabledMemberIds,
  lockedMemberIds,
  lockedMembers = EMPTY_LOCKED_MEMBERS,
  selectedMembers,
  setSelectedMembers,
}: {
  disabledLabel?: string;
  disabledMemberIds?: Set<string>;
  lockedMemberIds: Set<string>;
  lockedMembers?: SelectableFriend[];
  selectedMembers: SelectedMembersState;
  setSelectedMembers: Dispatch<SetStateAction<SelectedMembersState>>;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [friends, setFriends] = useState<SelectableFriend[]>([]);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestSeqRef = useRef(0);

  const selectedList = useMemo(
    () => Object.values(selectedMembers),
    [selectedMembers],
  );

  useEffect(() => {
    if (lockedMembers.length === 0) return;
    setSelectedMembers((current) => {
      const next = { ...current };
      lockedMembers.forEach((member) => {
        next[member.id] = member;
      });
      return next;
    });
  }, [lockedMembers, setSelectedMembers]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const loadFriends = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);

      const requestSeq = ++requestSeqRef.current;
      try {
        const result = await getSelectableFriends({
          keyword: debouncedKeyword,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        const baseItems =
          nextPage === 1 && lockedMembers.length > 0
            ? mergeFriends(lockedMembers, result.items)
            : result.items;
        if (requestSeq !== requestSeqRef.current) return;
        setFriends((current) =>
          nextPage === 1 ? baseItems : mergeFriends(current, result.items),
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (error) {
        if (requestSeq !== requestSeqRef.current) return;
        Alert.alert(
          "Không thể tải bạn bè",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        if (requestSeq === requestSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedKeyword, lockedMembers],
  );

  useEffect(() => {
    void loadFriends(1, "initial");
  }, [loadFriends]);

  const toggleMember = useCallback(
    (friend: SelectableFriend) => {
      if (lockedMemberIds.has(friend.id) || disabledMemberIds?.has(friend.id)) {
        return;
      }
      setSelectedMembers((current) => {
        if (current[friend.id]) {
          const next = { ...current };
          delete next[friend.id];
          return next;
        }
        return { ...current, [friend.id]: friend };
      });
    },
    [disabledMemberIds, lockedMemberIds, setSelectedMembers],
  );

  const removeMember = useCallback(
    (memberId: string) => {
      if (lockedMemberIds.has(memberId)) return;
      setSelectedMembers((current) => {
        const next = { ...current };
        delete next[memberId];
        return next;
      });
    },
    [lockedMemberIds, setSelectedMembers],
  );

  return (
    <>
      {selectedList.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.selectedList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {selectedList.map((friend) => (
            <SelectedMember
              friend={friend}
              key={friend.id}
              locked={lockedMemberIds.has(friend.id)}
              onRemove={removeMember}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.searchBox}>
        <Ionicons color={colors.textMuted} name="search" size={18} />
        <TextInput
          accessibilityLabel="Tìm bạn bè"
          onChangeText={setKeyword}
          placeholder="Tìm bạn bè..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={keyword}
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            friends.length === 0 && styles.emptyContent,
          ]}
          data={friends}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Không tìm thấy bạn bè.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          onEndReached={() => {
            if (!loadingMore && !refreshing && page < totalPages) {
              void loadFriends(page + 1, "more");
            }
          }}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadFriends(1, "refresh")}
            />
          }
          renderItem={({ item }) => {
            const isLocked = lockedMemberIds.has(item.id);
            const isSelected = Boolean(selectedMembers[item.id]);
            const isDisabled = isLocked || Boolean(disabledMemberIds?.has(item.id));
            return (
              <FriendRow
                disabledLabel={disabledLabel}
                friend={item}
                isDisabled={isDisabled}
                isLocked={isLocked}
                isSelected={isSelected}
                onToggle={toggleMember}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  checkbox: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabledText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  footer: { padding: spacing.lg },
  friendAvatar: { borderRadius: 26, height: 52, width: 52 },
  friendAvatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  friendInfo: { flex: 1 },
  friendName: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  friendRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 74,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  friendRowDisabled: { opacity: 0.55 },
  listContent: { backgroundColor: colors.surface, flexGrow: 1, paddingBottom: spacing.xl },
  loading: {
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: "center",
  },
  nameLine: { alignItems: "center", flexDirection: "row", gap: 4 },
  pressed: { opacity: 0.72 },
  removeSelected: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -3,
    top: -3,
    width: 20,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 42,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  selectedAvatar: { borderRadius: 24, height: 48, width: 48 },
  selectedAvatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  selectedItem: { alignItems: "center", gap: 4, width: 64 },
  selectedList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedName: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    maxWidth: 62,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
});

