import { router } from "expo-router";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
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
import { AuthAlert, useAuthAlert } from "@/features/auth/auth-alert";
import { ResponsiveContent } from "@/components/layout/responsive-content";
import { getResponsiveBottomPadding } from "@/components/layout/responsive-layout";
import { subscribeRealtimeNotifications } from "@/features/notifications/notification-events";
import { navigateNotification } from "@/features/notifications/notification-navigation";
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "@/services/notification.service";
import { layout, spacing } from "@/theme";
import type { NotificationItemModel } from "@/types/notification";
import { getNotificationUnreadCount, setNotificationUnreadCount } from "@/utils/notification-unread-count";
import { useResponsive } from "@/hooks/use-responsive";
import { type ThemeColors, useTheme } from "@/theme";


const PAGE_SIZE = 20;

const mergeNotifications = (
  current: NotificationItemModel[],
  incoming: NotificationItemModel[],
) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
};

export function NotificationsScreen() {
  const { alert, closeAlert, handleAlertAction, showAlert } = useAuthAlert();
  const { theme } = useTheme();
  const colors = theme.notifications;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isDesktopWeb } = useResponsive();
  const listBottomPadding = getResponsiveBottomPadding({
    desktopPadding: spacing.xl,
    isDesktopWeb,
    mobilePadding: 112,
  });
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
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const markingAllRead = useRef(false);
  const readRevision = useRef(0);

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
      const revision = readRevision.current;
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      if (mode === "more") setIsLoadingMore(true);

      try {
        const result = await getNotifications({
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        if (revision !== readRevision.current) return;

        setNotifications((current) =>
          nextPage === 1
            ? result.items
            : mergeNotifications(current, result.items),
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        console.info("[NotificationScreen] unread count fetched", {
          mode,
          page: result.page,
          source: "api",
          timestamp: new Date().toISOString(),
          unreadCount: result.unreadCount,
        });
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
        setNotifications((current) => {
          if (current.some((item) => item.id === notification.id)) {
            return current;
          }

          setUnreadCount((count) => count + 1);
          return [notification, ...current];
        });
      }),
    [],
  );

  const refresh = useCallback(() => {
    if (isRefreshing) return;
    return loadNotifications(1, "refresh");
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

  const handleMarkAllRead = useCallback(async () => {
    if (markingAllRead.current) return;
    markingAllRead.current = true;
    setIsMarkingAllRead(true);
    const ids = new Set(notifications.map(item => item.id));
    const unreadAtStart = getNotificationUnreadCount();
    try {
      await markAllNotificationsRead();
      // Ignore list requests that captured unread state before this mutation.
      readRevision.current += 1;
      setNotifications(current => current.map(item => ids.has(item.id) ? { ...item, isRead: true } : item));
      updateUnreadCount(Math.max(0, getNotificationUnreadCount() - unreadAtStart));
      // Reconcile notifications arriving during the mutation with server state.
      await loadNotifications(1, "refresh");
    } catch (error) {
      showAlert({ kind: "error", title: "Không thể đánh dấu tất cả", message: error instanceof Error ? error.message : "Vui lòng thử lại." });
    } finally {
      markingAllRead.current = false;
      setIsMarkingAllRead(false);
    }
  }, [loadNotifications, notifications, showAlert, updateUnreadCount]);

  const confirmMarkAllRead = useCallback(() => {
    if (markingAllRead.current || unreadCount === 0) return;
    showAlert({
      title: "Đánh dấu tất cả đã đọc?",
      message: "Tất cả thông báo hiện tại sẽ chuyển sang trạng thái đã đọc.",
      actionLabel: "Đánh dấu",
      onAction: () => { void handleMarkAllRead(); },
    });
  }, [handleMarkAllRead, showAlert, unreadCount]);

  return (
    <View style={styles.screen}>
      <ResponsiveContent maxWidth={layout.notificationMaxWidth}>
      <NotificationHeader
        isMarkingAllRead={isMarkingAllRead}
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
            { paddingBottom: listBottomPadding },
            notifications.length === 0 && styles.emptyContent,
          ]}
          data={notifications}
          initialNumToRender={10}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <NotificationEmpty
              isRetrying={isRefreshing}
              message={errorMessage}
              onRetry={refresh}
            />
          }
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
      </ResponsiveContent>
      <AuthAlert alert={alert} onAction={handleAlertAction} onClose={closeAlert} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {},
  emptyContent: { flexGrow: 1 },
  footer: { padding: spacing.lg },
  screen: { backgroundColor: colors.background, flex: 1 },
  skeletonList: { paddingTop: spacing.sm },
});
