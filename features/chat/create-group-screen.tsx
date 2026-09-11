import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MemberPicker } from "@/components/chat/member-picker";
import { showAppToast } from "@/components/common/app-toast";
import { UserAvatar } from "@/components/common/user-avatar";
import { emitRealtimeConversation } from "@/features/chat/chat-events";
import { createGroupConversation } from "@/services/chat.service";
import { getSelectableFriends } from "@/services/friend.service";
import { getUser } from "@/stores/session-store";
import { spacing } from "@/theme";
import { VerifiedBadge } from "@/components/common/verified-badge";
import type { SelectableFriend } from "@/types/chat-group";
import { type ThemeColors, useTheme } from "@/theme";


const PAGE_SIZE = 20;

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const mergeFriends = (
  current: SelectableFriend[],
  incoming: SelectableFriend[],
) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
};

const getRouteFriend = ({
  avatarUrl,
  displayName,
  id,
  isVerified,
}: {
  avatarUrl: string;
  displayName: string;
  id: string;
  isVerified: string;
}): SelectableFriend | null => {
  if (!id) return null;

  return {
    avatarUrl: avatarUrl || null,
    displayName: displayName || "Người dùng",
    id,
    isOnline: false,
    isVerified: isVerified === "true",
  };
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
            accessibilityLabel={`Bỏ chọn ${friend.displayName}`}
            accessibilityRole="button"
            onPress={() => onRemove(friend.id)}
            style={styles.removeSelected}
          >
            <Ionicons color={colors.dangerContrast} name="close" size={12} />
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
  friend,
  isLocked,
  isSelected,
  onToggle,
}: {
  friend: SelectableFriend;
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
      accessibilityState={{ checked: isSelected, disabled: isLocked }}
      disabled={isLocked}
      onPress={() => onToggle(friend)}
      style={({ pressed }) => [styles.friendRow, pressed && styles.pressed]}
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
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected ? (
          <Ionicons color={colors.primaryContrast} name="checkmark" size={15} />
        ) : null}
      </View>
    </Pressable>
  );
});

export function CreateGroupScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    defaultAvatarUrl?: string | string[];
    defaultIsVerified?: string | string[];
    defaultUserId?: string | string[];
    defaultUserName?: string | string[];
  }>();
  const defaultAvatarUrl = firstParam(params.defaultAvatarUrl);
  const defaultIsVerified = firstParam(params.defaultIsVerified);
  const defaultUserId = firstParam(params.defaultUserId);
  const defaultUserName = firstParam(params.defaultUserName);
  const lockedFriend = useMemo(
    () =>
      getRouteFriend({
        avatarUrl: defaultAvatarUrl,
        displayName: defaultUserName,
        id: defaultUserId,
        isVerified: defaultIsVerified,
      }),
    [defaultAvatarUrl, defaultIsVerified, defaultUserId, defaultUserName],
  );
  const lockedMemberIds = useMemo(
    () => new Set(lockedFriend ? [lockedFriend.id] : []),
    [lockedFriend],
  );
  const [currentUserId, setCurrentUserId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<string>();
  const [friends, setFriends] = useState<SelectableFriend[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<
    Record<string, SelectableFriend>
  >(() => (lockedFriend ? { [lockedFriend.id]: lockedFriend } : {}));
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const requestSeqRef = useRef(0);
  const selectedList = useMemo(
    () => Object.values(selectedMembers),
    [selectedMembers],
  );
  const lockedMembers = useMemo(
    () => (lockedFriend ? [lockedFriend] : []),
    [lockedFriend],
  );

  useEffect(() => {
    getUser().then((user) => setCurrentUserId(user?.id ?? ""));
  }, []);

  useEffect(() => {
    if (!lockedFriend) return;
    setSelectedMembers((current) => ({
      ...current,
      [lockedFriend.id]: lockedFriend,
    }));
  }, [lockedFriend]);

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
        const items = lockedFriend
          ? mergeFriends([lockedFriend], result.items)
          : result.items;
        if (requestSeq !== requestSeqRef.current) return;
        setFriends((current) =>
          nextPage === 1 ? items : mergeFriends(current, result.items),
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
    [debouncedKeyword, lockedFriend],
  );

  const pickAvatar = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập",
          "Hãy cho phép ANKT truy cập thư viện để chọn ảnh nhóm.",
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) setGroupAvatar(result.assets[0].uri);
  };

  const toggleMember = useCallback(
    (friend: SelectableFriend) => {
      if (lockedMemberIds.has(friend.id)) return;
      setSelectedMembers((current) => {
        if (current[friend.id]) {
          const next = { ...current };
          delete next[friend.id];
          return next;
        }
        return { ...current, [friend.id]: friend };
      });
    },
    [lockedMemberIds],
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
    [lockedMemberIds],
  );

  const createGroup = async () => {
    const name = groupName.trim();
    const memberIds = selectedList
      .map((member) => member.id)
      .filter((memberId) => memberId !== currentUserId);

    if (!name) {
      Alert.alert("Thiếu tên nhóm", "Vui lòng nhập tên nhóm.");
      return;
    }
    if (memberIds.length < 2) {
      Alert.alert("Chưa đủ thành viên", "Nhóm cần ít nhất 2 thành viên.");
      return;
    }

    setCreatingGroup(true);
    try {
      const conversation = await createGroupConversation({
        avatarUri: groupAvatar,
        memberIds,
        name,
      });
      emitRealtimeConversation(conversation);
      showAppToast({ message: "Nhóm chat đã được tạo.", type: "success" });
      router.replace({
        pathname: "/chat/[conversationId]",
        params: {
          conversationAvatarUrl: conversation.avatarUrl ?? "",
          conversationId: conversation.id,
          conversationName: conversation.name,
          conversationType: conversation.conversationType,
          isMuted: String(conversation.isMuted),
          isPinned: String(conversation.isPinned),
          memberCount: String(conversation.memberCount ?? ""),
          role: String(conversation.role ?? 0),
        },
      });
    } catch (error) {
      Alert.alert(
        "Không thể tạo nhóm",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={26} />
        </Pressable>
        <Text style={styles.headerTitle}>Tạo nhóm</Text>
        <Pressable
          accessibilityRole="button"
          disabled={creatingGroup}
          onPress={createGroup}
          style={styles.createButton}
        >
          {creatingGroup ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.createText}>Tạo</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.form}>
        <Pressable
          accessibilityRole="button"
          onPress={pickAvatar}
          style={styles.avatarPicker}
        >
          {groupAvatar ? (
            <Image source={{ uri: groupAvatar }} style={styles.groupAvatar} />
          ) : (
            <View style={styles.groupAvatarFallback}>
              <Ionicons color={colors.primary} name="people" size={34} />
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons color={colors.primaryContrast} name="camera" size={15} />
          </View>
        </Pressable>

        <TextInput
          accessibilityLabel="Tên nhóm"
          onChangeText={setGroupName}
          placeholder="Tên nhóm"
          placeholderTextColor={colors.textMuted}
          style={styles.nameInput}
          value={groupName}
        />

        {false && selectedList.length > 0 ? (
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

        {false ? <View style={styles.searchBox}>
          <Ionicons color={colors.textMuted} name="search" size={18} />
          <TextInput
            accessibilityLabel="Tìm bạn bè"
            onChangeText={setKeyword}
            placeholder="Tìm bạn bè..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={keyword}
          />
        </View> : null}
      </View>

      <MemberPicker
        lockedMemberIds={lockedMemberIds}
        lockedMembers={lockedMembers}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
      />

      {false ? (loading ? (
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
          renderItem={({ item }) => (
            <FriendRow
              friend={item}
              isLocked={lockedMemberIds.has(item.id)}
              isSelected={Boolean(selectedMembers[item.id])}
              onToggle={toggleMember}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )) : null}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatarPicker: { alignSelf: "center", position: "relative" },
  cameraBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    bottom: 0,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 32,
  },
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
  createButton: {
    alignItems: "center",
    minWidth: 48,
    justifyContent: "center",
  },
  createText: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  footer: { padding: spacing.lg },
  form: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
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
  groupAvatar: { borderRadius: 42, height: 84, width: 84 },
  groupAvatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 42,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
  headerButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  listContent: { backgroundColor: colors.surface, paddingBottom: spacing.xl },
  loading: { flex: 1, justifyContent: "center" },
  nameInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: spacing.md,
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
  screen: { backgroundColor: colors.surface, flex: 1 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 42,
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
  selectedList: { gap: spacing.sm, paddingVertical: spacing.xs },
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
