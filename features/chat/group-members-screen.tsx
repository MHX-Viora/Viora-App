import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AddMembersModal } from "@/components/chat/add-members-modal";
import { openProfileByUserId } from "@/features/profile/open-profile";
import {
  demoteGroupAdmin,
  getGroupDetails,
  getGroupMembers,
  promoteGroupAdmin,
  removeGroupMember,
  transferGroupOwner,
} from "@/services/chat.service";
import { getUser } from "@/stores/session-store";
import { spacing } from "@/theme";
import { VerifiedBadge } from "@/components/common/verified-badge";
import type { ChatGroupMember } from "@/types/chat";
import { type ThemeColors, useTheme } from "@/theme";


const PAGE_SIZE = 30;

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const mergeMembers = (
  current: ChatGroupMember[],
  incoming: ChatGroupMember[],
) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
};

const getRoleLabel = (role: number) => {
  if (role === 2) return "Chủ nhóm";
  if (role === 1) return "Quản trị viên";
  return "Thành viên";
};

const MemberRow = memo(function MemberRow({
  member,
  onLongPress,
  onOpenProfile,
}: {
  member: ChatGroupMember;
  onLongPress: (member: ChatGroupMember) => void;
  onOpenProfile: (member: ChatGroupMember) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      onLongPress={() => onLongPress(member)}
      onPress={() => onOpenProfile(member)}
      style={styles.row}
    >
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons color={colors.primary} name="person" size={22} />
        </View>
      )}
      <View style={styles.memberInfo}>
        <View style={styles.nameLine}>
          <Text numberOfLines={1} style={styles.name}>
            {member.displayName}
          </Text>
          {member.isVerified ? (
            <VerifiedBadge />
          ) : null}
        </View>
        <Text style={styles.status}>
          {member.isOnline ? "Đang hoạt động" : "Hoạt động gần đây"}
        </Text>
      </View>
      <Text style={styles.role}>{getRoleLabel(member.role)}</Text>
    </Pressable>
  );
});

export function GroupMembersScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    conversationId?: string | string[];
    role?: string | string[];
  }>();
  const conversationId = firstParam(params.conversationId);
  const routeRole = Number(firstParam(params.role)) || 0;
  const [myRole, setMyRole] = useState(routeRole);
  const [currentUserId, setCurrentUserId] = useState("");
  const [members, setMembers] = useState<ChatGroupMember[]>([]);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addMembersVisible, setAddMembersVisible] = useState(false);
  const [actionMember, setActionMember] = useState<ChatGroupMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const canAddMembers = myRole === 1 || myRole === 2;

  useEffect(() => {
    getUser().then((user) => setCurrentUserId(user?.id ?? ""));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const loadGroupDetails = useCallback(async () => {
    if (!conversationId) return;
    try {
      const group = await getGroupDetails(conversationId);
      setMyRole(group.role ?? 0);
    } catch {
      setMyRole(routeRole);
    }
  }, [conversationId, routeRole]);

  const loadMembers = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      if (!conversationId) return;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);

      try {
        const result = await getGroupMembers(conversationId, {
          keyword: debouncedKeyword,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        setMembers((current) =>
          nextPage === 1 ? result.items : mergeMembers(current, result.items),
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (error) {
        Alert.alert(
          "Không thể tải thành viên",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
        if (nextPage === 1) setMembers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [conversationId, debouncedKeyword],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([loadGroupDetails(), loadMembers(1, "refresh")]);
  }, [loadGroupDetails, loadMembers]);

  useEffect(() => {
    void loadGroupDetails();
    void loadMembers(1, "initial");
  }, [loadGroupDetails, loadMembers]);

  const runMemberAction = useCallback(
    (
      title: string,
      message: string,
      action: () => Promise<void>,
      destructive = false,
    ) => {
      Keyboard.dismiss();
      Alert.alert(title, message, [
        { text: "Hủy", style: "cancel" },
        {
          onPress: async () => {
            setActionLoading(true);
            try {
              await action();
              await refreshAll();
            } catch (error) {
              Alert.alert(
                title,
                error instanceof Error ? error.message : "Vui lòng thử lại.",
              );
            } finally {
              setActionLoading(false);
            }
          },
          style: destructive ? "destructive" : "default",
          text: "Xác nhận",
        },
      ]);
    },
    [refreshAll],
  );
  const openMemberActions = useCallback(
    (member: ChatGroupMember) => {
      if (actionLoading || myRole === 0 || !conversationId) return;
      if (member.id === currentUserId && member.role === 2) return;
      if (myRole === 1 && member.role !== 0) return;
      if (myRole === 2 && member.role === 2) return;
      Keyboard.dismiss();
      setActionMember(member);
    },
    [actionLoading, conversationId, currentUserId, myRole],
  );

  const openMemberProfile = useCallback((member: ChatGroupMember) => {
    Keyboard.dismiss();
    void openProfileByUserId(router, member.id);
  }, []);

  const closeActionSheet = useCallback(() => {
    if (actionLoading) return;
    setActionMember(null);
  }, [actionLoading]);

  const confirmAction = useCallback(
    (
      title: string,
      message: string,
      action: () => Promise<void>,
      destructive = false,
    ) => {
      setActionMember(null);
      runMemberAction(title, message, action, destructive);
    },
    [runMemberAction],
  );
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={26} />
        </Pressable>
        <Text style={styles.title}>Thành viên</Text>
        {canAddMembers ? (
          <Pressable
            accessibilityLabel="Thêm thành viên"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setAddMembersVisible(true)}
            style={styles.backButton}
          >
            <Ionicons color={colors.text} name="person-add-outline" size={22} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons color={colors.textMuted} name="search" size={18} />
          <TextInput
            accessibilityLabel="Tìm thành viên"
            onChangeText={setKeyword}
            placeholder="Tìm thành viên..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={keyword}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            members.length === 0 && styles.emptyContent,
          ]}
          data={members}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Không tìm thấy thành viên.</Text>
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
              void loadMembers(page + 1, "more");
            }
          }}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshAll()}
            />
          }
          renderItem={({ item }) => (
            <MemberRow
              member={item}
              onLongPress={openMemberActions}
              onOpenProfile={openMemberProfile}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <AddMembersModal
        conversationId={conversationId}
        onAdded={() => void refreshAll()}
        onClose={() => setAddMembersVisible(false)}
        visible={addMembersVisible}
      />
      <Modal
        animationType="fade"
        onRequestClose={closeActionSheet}
        transparent
        visible={actionMember !== null}
      >
        <View style={styles.sheetOverlay}>
          <Pressable onPress={closeActionSheet} style={StyleSheet.absoluteFill} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.xl) },
            ]}
          >
            <Text numberOfLines={1} style={styles.sheetTitle}>
              {actionMember?.displayName}
            </Text>
            <Text style={styles.sheetSubtitle}>Chọn thao tác quản lý</Text>

            {actionMember && myRole === 2 && actionMember.role === 0 ? (
              <Pressable
                onPress={() =>
                  confirmAction(
                    "Lên quản trị viên",
                    `Cho ${actionMember.displayName} làm quản trị viên?`,
                    () => promoteGroupAdmin(conversationId, actionMember.id),
                  )
                }
                style={styles.sheetAction}
              >
                <Text style={styles.sheetActionText}>Lên quản trị viên</Text>
              </Pressable>
            ) : null}
            {actionMember && myRole === 2 && actionMember.role === 1 ? (
              <Pressable
                onPress={() =>
                  confirmAction(
                    "Hạ quản trị viên",
                    `Hạ quyền quản trị viên của ${actionMember.displayName}?`,
                    () => demoteGroupAdmin(conversationId, actionMember.id),
                    true,
                  )
                }
                style={styles.sheetAction}
              >
                <Text style={styles.sheetActionText}>Hạ quản trị viên</Text>
              </Pressable>
            ) : null}
            {actionMember && myRole === 2 ? (
              <Pressable
                onPress={() =>
                  confirmAction(
                    "Chuyển quyền quản lý",
                    `Chuyển quyền chủ nhóm cho ${actionMember.displayName}?`,
                    () => transferGroupOwner(conversationId, actionMember.id),
                    true,
                  )
                }
                style={styles.sheetAction}
              >
                <Text style={styles.sheetActionText}>Chuyển quyền quản lý</Text>
              </Pressable>
            ) : null}
            {actionMember &&
            ((myRole === 2 && actionMember.role !== 2) ||
              (myRole === 1 && actionMember.role === 0)) ? (
              <Pressable
                onPress={() =>
                  confirmAction(
                    "Xóa khỏi nhóm",
                    `Xóa ${actionMember.displayName} khỏi nhóm?`,
                    () => removeGroupMember(conversationId, actionMember.id),
                    true,
                  )
                }
                style={styles.sheetAction}
              >
                <Text style={styles.sheetDangerText}>Xóa khỏi nhóm</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={closeActionSheet} style={styles.sheetCancel}>
              <Text style={styles.sheetCancelText}>Hủy</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: { borderRadius: 26, height: 52, width: 52 },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  backButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  footer: { padding: spacing.lg },
  header: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_10_23_41_0_94,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
  listContent: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  loading: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  memberInfo: { flex: 1 },
  name: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  nameLine: { alignItems: "center", flexDirection: "row", gap: 4 },
  role: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  row: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.visuals.rgb_152_80_232_0_56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 76,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
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
  searchWrap: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: spacing.xs,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  sheetAction: {
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  sheetActionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  sheetCancel: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: 50,
  },
  sheetCancelText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "900",
  },
  sheetDangerText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "900",
  },
  sheetOverlay: {
    backgroundColor: colors.visuals.rgb_15_23_42_0_38,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    paddingBottom: spacing.sm,
    textAlign: "center",
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  status: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
});
