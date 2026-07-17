import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    View,
} from "react-native";

import { NotificationEmpty } from "@/components/notifications/notification-empty";
import { NotificationHeader } from "@/components/notifications/notification-header";
import { NotificationItem } from "@/components/notifications/notification-item";
import { NotificationSkeleton } from "@/components/notifications/notification-skeleton";
import { subscribeRealtimeNotifications } from "@/features/notifications/notification-events";
import { navigateNotification } from "@/features/notifications/notification-navigation";
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "@/services/notification.service";
import { colors, spacing } from "@/theme";
import type { NotificationItemModel } from "@/types/notification";
import { setNotificationUnreadCount } from "@/utils/notification-unread-count";

const PAGE_SIZE = 20;

const mergeNotifications = (
  current: NotificationItemModel[],
  incoming: NotificationItemModel[],
) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
};

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItemModel[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  const updateUnreadCount = useCallback((count: number) => {
    const nextCount = Math.max(0, count);
    setUnreadCount(nextCount);
    setNotificationUnreadCount(nextCount);
  }, []);

  const decreaseUnreadCount = useCallback(() => {
    const nextCount = Math.max(0, unreadCount - 1);
    updateUnreadCount(nextCount);
  }, [unreadCount, updateUnreadCount]);

  const loadNotifications = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      if (mode === "more") setIsLoadingMore(true);

      try {
        const result = await getNotifications({
          page: nextPage,
          pageSize: PAGE_SIZE,
        });

        setNotifications((current) =>
          nextPage === 1
            ? result.items
            : mergeNotifications(current, result.items),
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        updateUnreadCount(result.unreadCount);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải thông báo.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [updateUnreadCount],
  );

  useEffect(() => {
    loadNotifications(1, "initial");
  }, [loadNotifications]);

  useEffect(
    () =>
      subscribeRealtimeNotifications((notification) => {
        setNotifications((current) =>
          current.some((item) => item.id === notification.id)
            ? current
            : [notification, ...current],
        );
        setUnreadCount((current) => current + 1);
      }),
    [],
  );

  const refresh = useCallback(() => {
    if (isRefreshing) return;
    loadNotifications(1, "refresh");
  }, [isRefreshing, loadNotifications]);

  const loadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || page >= totalPages)
      return;
    loadNotifications(page + 1, "more");
  }, [
    isLoading,
    isLoadingMore,
    isRefreshing,
    loadNotifications,
    page,
    totalPages,
  ]);

  const markItemReadLocally = useCallback(
    (id: string) => {
      setNotifications((current) =>
        current.map((item) =>
          item.id === id && !item.isRead ? { ...item, isRead: true } : item,
        ),
      );
      decreaseUnreadCount();
    },
    [decreaseUnreadCount],
  );

  const handleMarkNotificationRead = useCallback(
    async (notification: NotificationItemModel) => {
      if (notification.isRead || markingReadId) return;

      setMarkingReadId(notification.id);
      try {
        await markNotificationRead(notification.id);
        markItemReadLocally(notification.id);
      } catch (error) {
        Alert.alert(
          "Không thể cập nhật thông báo",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        setMarkingReadId(null);
      }
    },
    [markItemReadLocally, markingReadId],
  );

  const handlePressNotification = useCallback(
    async (notification: NotificationItemModel) => {
      if (!notification.isRead) {
        try {
          await markNotificationRead(notification.id);
          markItemReadLocally(notification.id);
        } catch (error) {
          Alert.alert(
            "Không thể cập nhật thông báo",
            error instanceof Error ? error.message : "Vui lòng thử lại.",
          );
          return;
        }
      }

      navigateNotification(notification, router);
    },
    [markItemReadLocally],
  );

  const confirmMarkAllRead = useCallback(() => {
    Alert.alert(
      "Đánh dấu tất cả đã đọc?",
      "Tất cả thông báo hiện tại sẽ chuyển sang trạng thái đã đọc.",
      [
        { style: "cancel", text: "Hủy" },
        {
          onPress: async () => {
            try {
              await markAllNotificationsRead();
              setNotifications((current) =>
                current.map((item) => ({ ...item, isRead: true })),
              );
              updateUnreadCount(0);
            } catch (error) {
              Alert.alert(
                "Không thể đánh dấu tất cả",
                error instanceof Error ? error.message : "Vui lòng thử lại.",
              );
            }
          },
          text: "Đánh dấu",
        },
      ],
    );
  }, [updateUnreadCount]);

  return (
    <View style={styles.screen}>
      <NotificationHeader
        onMarkAllRead={confirmMarkAllRead}
        unreadCount={unreadCount}
      />
      {isLoading ? (
        <View style={styles.skeletonList}>
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.content,
            notifications.length === 0 && styles.emptyContent,
          ]}
          data={notifications}
          initialNumToRender={10}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<NotificationEmpty message={errorMessage} />}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          maxToRenderPerBatch={10}
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          onRefresh={refresh}
          refreshing={isRefreshing}
          removeClippedSubviews
          renderItem={({ item }) => (
            <NotificationItem
              isMarkingRead={markingReadId === item.id}
              notification={item}
              onMarkRead={handleMarkNotificationRead}
              onPress={handlePressNotification}
            />
          )}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={40}
          windowSize={8}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 112 },
  emptyContent: { flexGrow: 1 },
  footer: { padding: spacing.lg },
  screen: { backgroundColor: colors.background, flex: 1 },
  skeletonList: { paddingTop: spacing.sm },
});
