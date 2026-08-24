import Ionicons from "@expo/vector-icons/Ionicons";
import { UserAvatar } from "@/components/common/user-avatar";
import { router, useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { showAppToast } from "@/components/common/app-toast";
import { VerifiedBadge } from "@/components/common/verified-badge";
import { openProfileByUserId } from "@/features/profile/open-profile";
import {
  acceptFriendRequest,
  getFriends,
  rejectFriendRequest,
} from "@/services/friend.service";
import { spacing } from "@/theme";
import type { FriendListItem, FriendStatus } from "@/types/friend";
import { type ThemeColors, useTheme } from "@/theme";


const PAGE_SIZE = 20;
type FriendTab = "requests" | "friends";

const tabStatus: Record<FriendTab, FriendStatus> = {
  friends: "Accepted",
  requests: "Pending",
};

const tabLabels: Record<FriendTab, string> = {
  friends: "Bạn bè",
  requests: "Yêu cầu kết bạn",
};

const getInitialTab = (value?: string): FriendTab =>
  value === "requests" ? "requests" : "friends";

const getMutualLabel = (count: number) =>
  count === 1 ? "1 bạn chung" : `${count} bạn chung`;

const mergeFriends = (
  current: FriendListItem[],
  incoming: FriendListItem[],
) => {
  const seen = new Set(current.map((item) => item.friendshipId));
  return [...current, ...incoming.filter((item) => !seen.has(item.friendshipId))];
};

export function FriendsScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ initialTab?: string }>();
  const [activeTab, setActiveTab] = useState<FriendTab>(
    getInitialTab(params.initialTab),
  );
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [items, setItems] = useState<FriendListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [actingFriendshipId, setActingFriendshipId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 400);

    return () => clearTimeout(timeout);
  }, [keyword]);

  const loadFriends = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      if (mode === "more") setIsLoadingMore(true);

      try {
        const response = await getFriends({
          keyword: debouncedKeyword,
          page: nextPage,
          pageSize: PAGE_SIZE,
          status: tabStatus[activeTab],
        });

        setItems((current) =>
          nextPage === 1 ? response.items : mergeFriends(current, response.items),
        );
        setPage(response.page);
        setTotalPages(response.totalPages);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách bạn bè.",
        );
        if (nextPage === 1) setItems([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [activeTab, debouncedKeyword],
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotalPages(1);
    loadFriends(1, "initial");
  }, [loadFriends]);

  const changeTab = useCallback((tab: FriendTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  }, [activeTab]);

  const refresh = useCallback(() => {
    if (isRefreshing) return;
    loadFriends(1, "refresh");
  }, [isRefreshing, loadFriends]);

  const loadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || page >= totalPages) return;
    loadFriends(page + 1, "more");
  }, [isLoading, isLoadingMore, isRefreshing, loadFriends, page, totalPages]);

  const removeFriendship = useCallback((friendshipId: string) => {
    setItems((current) =>
      current.filter((item) => item.friendshipId !== friendshipId),
    );
  }, []);

  const acceptRequest = useCallback(
    async (friendshipId: string) => {
      if (actingFriendshipId) return;

      setActingFriendshipId(friendshipId);
      try {
        await acceptFriendRequest(friendshipId);
        removeFriendship(friendshipId);
        showAppToast({
          message: "Đã đồng ý lời mời kết bạn.",
          type: "success",
        });
      } catch (error) {
        Alert.alert(
          "Không thể xác nhận",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        setActingFriendshipId(null);
      }
    },
    [actingFriendshipId, removeFriendship],
  );

  const rejectRequest = useCallback(
    async (friendshipId: string) => {
      if (actingFriendshipId) return;

      setActingFriendshipId(friendshipId);
      try {
        await rejectFriendRequest(friendshipId);
        removeFriendship(friendshipId);
        showAppToast({
          message: "Đã từ chối lời mời kết bạn.",
          type: "success",
        });
      } catch (error) {
        Alert.alert(
          "Không thể từ chối",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        setActingFriendshipId(null);
      }
    },
    [actingFriendshipId, removeFriendship],
  );

  const openProfile = useCallback((userId: string) => {
    void openProfileByUserId(router, userId);
  }, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.searchBox}>
          <Ionicons color={colors.textMuted} name="search" size={19} />
          <TextInput
            accessibilityLabel="Tìm kiếm bạn bè"
            onChangeText={setKeyword}
            placeholder="Tìm kiếm theo tên"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={keyword}
          />
          {keyword.length > 0 && (
            <Pressable
              accessibilityLabel="Xóa tìm kiếm"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setKeyword("")}
            >
              <Ionicons color={colors.textMuted} name="close-circle" size={19} />
            </Pressable>
          )}
        </View>
        <View style={styles.tabs}>
          {(["requests", "friends"] as const).map((tab) => (
            <Pressable
              accessibilityRole="button"
              key={tab}
              onPress={() => changeTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tabLabels[tab]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    ),
    [activeTab, changeTab, keyword],
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.text} name="chevron-back" size={26} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Bạn bè
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          {listHeader}
          <FriendSkeleton />
          <FriendSkeleton />
          <FriendSkeleton />
          <FriendSkeleton />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.emptyContent,
          ]}
          data={items}
          initialNumToRender={10}
          keyExtractor={(item) => item.friendshipId}
          ListEmptyComponent={
            <FriendEmpty
              errorMessage={errorMessage}
              onRetry={() => loadFriends(1, "initial")}
              tab={activeTab}
            />
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          ListHeaderComponent={listHeader}
          maxToRenderPerBatch={10}
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          onRefresh={refresh}
          refreshing={isRefreshing}
          removeClippedSubviews
          renderItem={({ item }) => (
            <FriendRow
              activeTab={activeTab}
              actingFriendshipId={actingFriendshipId}
              item={item}
              onAccept={acceptRequest}
              onOpenProfile={openProfile}
              onReject={rejectRequest}
            />
          )}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={40}
          windowSize={8}
        />
      )}
    </SafeAreaView>
  );
}

type FriendRowProps = {
  activeTab: FriendTab;
  actingFriendshipId: string | null;
  item: FriendListItem;
  onAccept: (friendshipId: string) => void;
  onOpenProfile: (userId: string) => void;
  onReject: (friendshipId: string) => void;
};

const FriendRow = memo(function FriendRow({
  activeTab,
  actingFriendshipId,
  item,
  onAccept,
  onOpenProfile,
  onReject,
}: FriendRowProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isBusy = actingFriendshipId === item.friendshipId;
  const content = (
    <>
      <UserAvatar
        displayName={item.user.displayName}
        imageUrl={item.user.avatarUrl}
        size={56}
        style={styles.avatar}
      />
      <View style={styles.friendInfo}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.friendName}>
            {item.user.displayName}
          </Text>
          {item.user.isVerified && (
            <VerifiedBadge
              accessibilityLabel="Tài khoản đã xác minh"
              size={16}
            />
          )}
        </View>
        {item.user.mutualFriendCount > 0 && (
          <Text style={styles.mutualText}>
            {getMutualLabel(item.user.mutualFriendCount)}
          </Text>
        )}
      </View>
    </>
  );

  if (activeTab === "friends") {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => onOpenProfile(item.user.id)}
        style={({ pressed }) => [styles.friendRow, pressed && styles.pressed]}
      >
        {content}
        <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
      </Pressable>
    );
  }

  return (
    <View style={styles.requestRow}>
      <View style={styles.requestPerson}>{content}</View>
      <View style={styles.requestActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => onAccept(item.friendshipId)}
          style={[styles.confirmButton, isBusy && styles.disabledButton]}
        >
          {isBusy ? (
            <ActivityIndicator color={colors.primaryContrast} size="small" />
          ) : (
            <Text style={styles.confirmText}>Xác nhận</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => onReject(item.friendshipId)}
          style={[styles.rejectButton, isBusy && styles.disabledButton]}
        >
          <Text style={styles.rejectText}>Từ chối</Text>
        </Pressable>
      </View>
    </View>
  );
});

function FriendEmpty({
  errorMessage,
  onRetry,
  tab,
}: {
  errorMessage: string;
  onRetry: () => void;
  tab: FriendTab;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasError = Boolean(errorMessage);

  return (
    <View style={styles.empty}>
      <Ionicons
        color={colors.primary}
        name={tab === "requests" ? "person-add-outline" : "people-outline"}
        size={46}
      />
      <Text style={styles.emptyTitle}>
        {hasError
          ? errorMessage
          : tab === "requests"
            ? "Bạn chưa có lời mời kết bạn."
            : "Bạn chưa có bạn bè."}
      </Text>
      {hasError && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      )}
    </View>
  );
}

function FriendSkeleton() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 650,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 650,
          toValue: 0.45,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.skeletonRow}>
      <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
      <View style={styles.skeletonInfo}>
        <Animated.View style={[styles.skeletonName, { opacity }]} />
        <Animated.View style={[styles.skeletonMeta, { opacity }]} />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: { backgroundColor: colors.border, borderRadius: 28, height: 56, width: 56 },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    height: 38,
    justifyContent: "center",
  },
  confirmText: {
    color: colors.primaryContrast,
    fontSize: 14,
    fontWeight: "800",
  },
  disabledButton: { opacity: 0.62 },
  empty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyContent: { flexGrow: 1 },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.md,
    textAlign: "center",
  },
  footer: { padding: spacing.lg },
  friendInfo: { flex: 1 },
  friendName: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  friendRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.visuals.rgb_152_80_232_0_56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    minHeight: 78,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_10_23_41_0_94,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  headerSpacer: { width: 40 },
  listContent: { backgroundColor: colors.background, paddingBottom: spacing.xl },
  listHeader: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: spacing.md,
  },
  loadingWrap: { backgroundColor: colors.background, flex: 1 },
  mutualText: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  pressed: { opacity: 0.68 },
  rejectButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 38,
    justifyContent: "center",
  },
  rejectText: { color: colors.text, fontSize: 14, fontWeight: "800" },
  requestActions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  requestPerson: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  requestRow: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.visuals.rgb_152_80_232_0_56,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.primaryContrast,
    fontSize: 14,
    fontWeight: "800",
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    paddingVertical: 0,
  },
  skeletonAvatar: {
    backgroundColor: colors.border,
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  skeletonInfo: { flex: 1, gap: spacing.sm },
  skeletonMeta: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 11,
    width: 88,
  },
  skeletonName: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 14,
    width: 150,
  },
  skeletonRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 78,
    paddingHorizontal: spacing.md,
  },
  tab: {
    alignItems: "center",
    borderRadius: 9,
    flex: 1,
    height: 38,
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: "800" },
  tabTextActive: { color: colors.primary },
  tabs: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "900" },
});
