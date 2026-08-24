import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConversationRow } from "@/components/chat/conversation-row";
import { showAppToast } from "@/components/common/app-toast";
import { CONVERSATIONS_PAGE_SIZE } from "@/constants/conversations";
import {
  subscribeRealtimeConversationDissolved,
  subscribeRealtimeConversationMutedChanges,
  subscribeRealtimeConversationPinnedChanges,
  subscribeRealtimeConversationReads,
  subscribeRealtimeConversations,
  subscribeRealtimeNewMessageNotifications,
  subscribeRealtimeSyncRequests,
} from "@/features/chat/chat-events";
import {
  getDesktopConversationMenuTop,
  shouldAutoOpenConversationRoute,
} from "@/features/chat/responsive-chat-layout";
import { useResponsive } from "@/hooks/use-responsive";
import {
  getConversation,
  getConversations,
  markConversationRead,
  setConversationMuted,
  setConversationPinned,
} from "@/services/chat.service";
import { syncChatUnreadCount } from "@/services/chat-sync.service";
import { scanQrFromDeviceImage } from "@/services/qr-image-scanner";
import { getUser } from "@/stores/session-store";
import { layout, spacing } from "@/theme";
import type { Conversation } from "@/types/chat";
import {
  firstParam,
  getConversationRouteParams,
  getConversationTitle,
  getLastMessageText,
  isConversationGoneError,
  mergeConversations,
  sortConversations,
} from "@/utils/conversation-list";
import { type ThemeColors, useTheme } from "@/theme";
import { parseGroupQrValue } from "@/utils/qr-code";


export function ConversationsScreen({
  autoOpenRequestedConversation = true,
}: {
  autoOpenRequestedConversation?: boolean;
} = {}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { height: viewportHeight, isDesktopWeb } = useResponsive();
  const params = useLocalSearchParams<{
    conversationId?: string | string[];
    scrollToMessageId?: string | string[];
  }>();
  const [items, setItems] = useState<Conversation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [conversationMenuAnchorY, setConversationMenuAnchorY] = useState(0);
  const [quickMenuVisible, setQuickMenuVisible] = useState(false);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [qrScanMessage, setQrScanMessage] = useState("");
  const [qrScanning, setQrScanning] = useState(true);
  const [qrImageLoading, setQrImageLoading] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [openedConversationId, setOpenedConversationId] = useState("");
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const hasLoadedRef = useRef(false);

  const requestedConversationId = firstParam(params.conversationId);
  const requestedMessageId = firstParam(params.scrollToMessageId);

  useEffect(() => {
    getUser().then((user) => setCurrentUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const openConversation = useCallback(
    (conversation: Conversation) => {
      router.push({
        pathname: "/chat/[conversationId]",
        params: getConversationRouteParams(
          conversation,
          requestedMessageId || undefined,
        ),
      });
    },
    [requestedMessageId],
  );

  const openCreateGroup = useCallback(() => {
    setQuickMenuVisible(false);
    router.push("/chat/create-group");
  }, []);

  const openFriends = useCallback(() => {
    setQuickMenuVisible(false);
    router.push("/friends");
  }, []);

  const openQrScanner = useCallback(() => {
    setQrScanMessage("");
    setQrScanning(true);
    setQrScannerVisible(true);
  }, []);

  const closeQrScanner = useCallback(() => {
    setQrScannerVisible(false);
    setQrScanMessage("");
    setQrScanning(true);
  }, []);

  const processGroupQrData = useCallback(
    (data: string) => {
      setQrScanning(false);
      const target = parseGroupQrValue(data);
      if (!target) {
        setQrScanMessage("Mã QR nhóm không hợp lệ.");
        return;
      }

      setQrScanMessage("Đã tìm thấy nhóm.");
      setTimeout(() => {
        closeQrScanner();
        if ("inviteCode" in target) {
          router.push({
            pathname: "/chat/group-preview",
            params: { inviteCode: target.inviteCode },
          });
        } else {
          router.push({
            pathname: "/chat/group/[groupId]",
            params: { groupId: target.conversationId },
          });
        }
      }, 450);
    },
    [closeQrScanner],
  );

  const handleGroupQrScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!qrScanning) return;
      processGroupQrData(data);
    },
    [processGroupQrData, qrScanning],
  );

  const handleSelectGroupQrImage = useCallback(async () => {
    if (qrImageLoading) return;
    setQrImageLoading(true);
    try {
      const result = await scanQrFromDeviceImage();
      if (result.status === "found") {
        processGroupQrData(result.data);
      } else if (result.status === "not-found") {
        setQrScanning(false);
        setQrScanMessage("Không tìm thấy mã QR trong ảnh đã chọn.");
      }
    } catch {
      setQrScanning(false);
      setQrScanMessage("Không thể đọc ảnh QR. Vui lòng chọn ảnh khác.");
    } finally {
      setQrImageLoading(false);
    }
  }, [processGroupQrData, qrImageLoading]);

  const load = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      if (mode === "more") setIsLoadingMore(true);
      try {
        const result = await getConversations({
          keyword: debouncedKeyword,
          page: nextPage,
          pageSize: CONVERSATIONS_PAGE_SIZE,
        });
        setItems((current) =>
          nextPage === 1
            ? sortConversations(result.items)
            : mergeConversations(current, result.items),
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        setError("");
        if (nextPage === 1) {
          console.info("[ChatSync] conversations fetched", {
            itemCount: result.items.length,
            page: result.page,
            source: "api",
            timestamp: new Date().toISOString(),
          });
          void syncChatUnreadCount("conversation-focus");
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải cuộc trò chuyện.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [debouncedKeyword],
  );

  useFocusEffect(
    useCallback(() => {
      const mode = hasLoadedRef.current ? "refresh" : "initial";
      hasLoadedRef.current = true;
      void load(1, mode);
    }, [load]),
  );

  useEffect(() => {
    if (!shouldAutoOpenConversationRoute({
      allowRequestedAutoOpen: autoOpenRequestedConversation,
      openedConversationId,
      requestedConversationId,
    })) {
      return;
    }

    const existing = items.find((item) => item.id === requestedConversationId);
    if (existing) {
      setOpenedConversationId(requestedConversationId);
      openConversation(existing);
      return;
    }

    let isMounted = true;
    void getConversation(requestedConversationId)
      .then((conversation) => {
        if (!isMounted) return;
        setItems((current) => mergeConversations(current, [conversation]));
        setOpenedConversationId(requestedConversationId);
        openConversation(conversation);
      })
      .catch((openError) => {
        if (!isMounted) return;
        setOpenedConversationId(requestedConversationId);
        Alert.alert(
          "Không thể mở cuộc trò chuyện",
          openError instanceof Error ? openError.message : "Vui lòng thử lại.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [
    autoOpenRequestedConversation,
    items,
    openConversation,
    openedConversationId,
    requestedConversationId,
  ]);

  useEffect(
    () =>
      subscribeRealtimeConversations((conversation) => {
        setItems((current) => {
          const withoutCurrent = current.filter(
            (item) => item.id !== conversation.id,
          );
          if (conversation.lastMessage)
            return sortConversations([conversation, ...withoutCurrent]);
          const index = current.findIndex(
            (item) => item.id === conversation.id,
          );
          if (index < 0) return sortConversations([conversation, ...current]);
          return sortConversations(
            current.map((item) =>
              item.id === conversation.id ? conversation : item,
            ),
          );
        });
      }),
    [],
  );

  useEffect(
    () =>
      subscribeRealtimeConversationPinnedChanges((event) => {
        setItems((current) =>
          sortConversations(
            current.map((item) =>
              item.id === event.conversationId
                ? { ...item, isPinned: event.isPinned }
                : item,
            ),
          ),
        );
      }),
    [],
  );

  useEffect(
    () =>
      subscribeRealtimeConversationMutedChanges((event) => {
        setItems((current) =>
          current.map((item) =>
            item.id === event.conversationId
              ? { ...item, isMuted: event.isMuted }
              : item,
          ),
        );
      }),
    [],
  );

  useEffect(
    () =>
      subscribeRealtimeConversationReads((event) => {
        if (event.userId !== currentUserId) return;
        setItems((current) =>
          current.map((item) =>
            item.id === event.conversationId
              ? { ...item, unreadCount: event.unreadCount }
              : item,
          ),
        );
      }),
    [currentUserId],
  );

  useEffect(
    () =>
      subscribeRealtimeNewMessageNotifications((event) => {
        setItems((current) =>
          current.map((item) =>
            item.id === event.conversationId
              ? { ...item, unreadCount: event.unreadCount }
              : item,
          ),
        );
      }),
    [],
  );

  useEffect(
    () =>
      subscribeRealtimeConversationDissolved((event) => {
        setItems((current) =>
          current.filter((item) => item.id !== event.conversationId),
        );
      }),
    [],
  );

  useEffect(
    () =>
      subscribeRealtimeSyncRequests(() => {
        void load(1, "refresh");
      }),
    [load],
  );

  const setItemActionLoading = useCallback((id: string, loading: boolean) => {
    setActionLoadingIds((current) => {
      const next = new Set(current);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const updateConversationLocal = useCallback(
    (conversationId: string, patch: Partial<Conversation>) => {
      setItems((current) =>
        sortConversations(
          current.map((item) =>
            item.id === conversationId ? { ...item, ...patch } : item,
          ),
        ),
      );
    },
    [],
  );

  const removeDissolvedConversation = useCallback((conversationId: string) => {
    setItems((current) => current.filter((item) => item.id !== conversationId));
    showAppToast({ message: "Nhóm đã bị giải tán.", type: "success" });
  }, []);

  const togglePinConversation = useCallback(
    async (conversation: Conversation) => {
      if (actionLoadingIds.has(conversation.id)) return;
      const nextPinned = !conversation.isPinned;
      setItemActionLoading(conversation.id, true);
      updateConversationLocal(conversation.id, { isPinned: nextPinned });
      try {
        await setConversationPinned(conversation.id, nextPinned);
      } catch (pinError) {
        if (isConversationGoneError(pinError)) {
          removeDissolvedConversation(conversation.id);
          return;
        }
        updateConversationLocal(conversation.id, {
          isPinned: conversation.isPinned,
        });
        Alert.alert(
          "Không thể cập nhật ghim",
          pinError instanceof Error ? pinError.message : "Vui lòng thử lại.",
        );
      } finally {
        setItemActionLoading(conversation.id, false);
      }
    },
    [
      actionLoadingIds,
      removeDissolvedConversation,
      setItemActionLoading,
      updateConversationLocal,
    ],
  );

  const markConversationReadLocal = useCallback(
    async (conversation: Conversation) => {
      if (actionLoadingIds.has(conversation.id)) return;
      setItemActionLoading(conversation.id, true);
      updateConversationLocal(conversation.id, { unreadCount: 0 });
      try {
        await markConversationRead(conversation.id);
        console.info("[ChatSync] conversation marked read", {
          conversationId: conversation.id,
          source: "api",
          timestamp: new Date().toISOString(),
          unreadCount: 0,
        });
        void syncChatUnreadCount("mark-read");
      } catch (readError) {
        if (isConversationGoneError(readError)) {
          removeDissolvedConversation(conversation.id);
          return;
        }
        updateConversationLocal(conversation.id, {
          unreadCount: conversation.unreadCount,
        });
        Alert.alert(
          "Không thể đánh dấu đã đọc",
          readError instanceof Error ? readError.message : "Vui lòng thử lại.",
        );
      } finally {
        setItemActionLoading(conversation.id, false);
      }
    },
    [
      actionLoadingIds,
      removeDissolvedConversation,
      setItemActionLoading,
      updateConversationLocal,
    ],
  );

  const toggleMuteConversation = useCallback(
    async (conversation: Conversation) => {
      if (actionLoadingIds.has(conversation.id)) return;
      const nextMuted = !conversation.isMuted;
      setItemActionLoading(conversation.id, true);
      updateConversationLocal(conversation.id, { isMuted: nextMuted });
      try {
        await setConversationMuted(conversation.id, nextMuted);
      } catch (muteError) {
        if (isConversationGoneError(muteError)) {
          removeDissolvedConversation(conversation.id);
          return;
        }
        updateConversationLocal(conversation.id, {
          isMuted: conversation.isMuted,
        });
        Alert.alert(
          "Không thể cập nhật thông báo",
          muteError instanceof Error ? muteError.message : "Vui lòng thử lại.",
        );
      } finally {
        setItemActionLoading(conversation.id, false);
      }
    },
    [
      actionLoadingIds,
      removeDissolvedConversation,
      setItemActionLoading,
      updateConversationLocal,
    ],
  );

  const openConversationMenu = useCallback(
    (conversation: Conversation, anchorY: number) => {
      setConversationMenuAnchorY(anchorY);
      setSelectedConversation(conversation);
    },
    [],
  );

  const runConversationAction = useCallback(
    (action: (conversation: Conversation) => void) => {
      if (!selectedConversation) return;
      const conversation = selectedConversation;
      setSelectedConversation(null);
      action(conversation);
    },
    [selectedConversation],
  );

  const empty = useMemo(
    () => (
      <View style={styles.empty}>
        <Ionicons
          color={colors.textMuted}
          name="chatbubbles-outline"
          size={36}
        />
        <Text style={styles.emptyText}>
          {error || "Chưa có cuộc trò chuyện."}
        </Text>
      </View>
    ),
    [error],
  );

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(spacing.xl, insets.top + spacing.lg) },
        ]}
      >
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Trò chuyện</Text>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Quét mã QR nhóm"
              accessibilityRole="button"
              onPress={openQrScanner}
              style={({ pressed }) => [
                styles.headerIconButton,
                pressed && styles.rowPressed,
              ]}
            >
              <Ionicons color={colors.primary} name="qr-code-outline" size={22} />
            </Pressable>
            <Pressable
              accessibilityLabel="Mở chức năng"
              accessibilityRole="button"
              onPress={() => setQuickMenuVisible(true)}
              style={({ pressed }) => [
                styles.headerIconButton,
                styles.primaryHeaderIconButton,
                pressed && styles.rowPressed,
              ]}
            >
              <Ionicons color={colors.primaryContrast} name="add" size={24} />
            </Pressable>
          </View>
        </View>
        <View style={styles.searchBox}>
          <Ionicons color={colors.textMuted} name="search" size={18} />
          <TextInput
            accessibilityLabel="Tìm kiếm cuộc trò chuyện"
            onChangeText={setKeyword}
            placeholder="Tìm kiếm"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={keyword}
          />
        </View>
      </View>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.emptyContent,
          ]}
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={empty}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          onEndReached={() => {
            if (!isLoadingMore && !isRefreshing && page < totalPages)
              load(page + 1, "more");
          }}
          onEndReachedThreshold={0.35}
          onRefresh={() => load(1, "refresh")}
          refreshing={isRefreshing}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              isPinLoading={actionLoadingIds.has(item.id)}
              onOpen={openConversation}
              onOpenMenu={openConversationMenu}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Modal
        animationType="fade"
        onRequestClose={() => setQuickMenuVisible(false)}
        transparent
        visible={quickMenuVisible}
      >
        <Pressable
          onPress={() => setQuickMenuVisible(false)}
          style={styles.quickMenuOverlay}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.quickMenu, { top: insets.top + 68 }]}
          >
            <Pressable onPress={openFriends} style={styles.quickMenuItem}>
              <View style={styles.quickMenuIcon}>
                <Ionicons color={colors.primary} name="person-add-outline" size={20} />
              </View>
              <Text style={styles.quickMenuText}>Thêm bạn</Text>
            </Pressable>
            <Pressable onPress={openCreateGroup} style={styles.quickMenuItem}>
              <View style={styles.quickMenuIcon}>
                <Ionicons color={colors.primary} name="people-outline" size={20} />
              </View>
              <Text style={styles.quickMenuText}>Tạo nhóm</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={closeQrScanner}
        visible={qrScannerVisible}
      >
        <View style={[styles.qrScreen, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.qrHeader}>
            <Pressable
              accessibilityLabel="Đóng quét mã QR"
              onPress={closeQrScanner}
              style={styles.headerIconButton}
            >
              <Ionicons color={colors.text} name="close" size={24} />
            </Pressable>
            <Text style={styles.qrTitle}>Quét mã QR nhóm</Text>
            <View style={styles.headerIconButton} />
          </View>
          {cameraPermission?.granted ? (
            <View style={styles.qrBody}>
              <Text style={styles.qrHelp}>Đặt mã QR nhóm vào giữa khung hình</Text>
              <View style={styles.cameraWrap}>
                <CameraView
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={qrScanning ? handleGroupQrScanned : undefined}
                  style={StyleSheet.absoluteFillObject}
                />
                <View pointerEvents="none" style={styles.scanFrame} />
              </View>
              <Pressable
                accessibilityLabel="Chọn ảnh QR"
                accessibilityRole="button"
                disabled={qrImageLoading}
                onPress={handleSelectGroupQrImage}
                style={styles.qrImageButton}
              >
                <Ionicons color={colors.primary} name="image-outline" size={20} />
                <Text style={styles.qrImageButtonText}>
                  {qrImageLoading ? "Đang đọc ảnh..." : "Chọn ảnh QR"}
                </Text>
              </Pressable>
              {qrScanMessage ? (
                <View style={styles.qrResult}>
                  <Text style={styles.qrResultText}>{qrScanMessage}</Text>
                  {!qrScanning && !qrScanMessage.startsWith("Đã") ? (
                    <Pressable
                      onPress={() => {
                        setQrScanMessage("");
                        setQrScanning(true);
                      }}
                    >
                      <Text style={styles.scanAgainText}>Quét lại</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.qrPermission}>
              <Ionicons color={colors.textMuted} name="camera-outline" size={42} />
              <Text style={styles.qrPermissionText}>
                ANKT cần quyền camera để quét mã QR nhóm.
              </Text>
              <Pressable onPress={requestCameraPermission} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Cho phép camera</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Chọn ảnh QR"
                accessibilityRole="button"
                disabled={qrImageLoading}
                onPress={handleSelectGroupQrImage}
                style={styles.qrImageButton}
              >
                <Ionicons color={colors.primary} name="image-outline" size={20} />
                <Text style={styles.qrImageButtonText}>
                  {qrImageLoading ? "Đang đọc ảnh..." : "Chọn ảnh QR"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedConversation(null)}
        transparent
        visible={selectedConversation !== null}
      >
        <Pressable
          onPress={() => setSelectedConversation(null)}
          style={[
            styles.menuOverlay,
            isDesktopWeb && styles.desktopMenuOverlay,
          ]}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.menuSheet,
              isDesktopWeb
                ? [
                    styles.desktopMenuSheet,
                    {
                      left: layout.chatSidebarWidth + spacing.md,
                      top: getDesktopConversationMenuTop({
                        anchorY: conversationMenuAnchorY,
                        viewportHeight,
                      }),
                    },
                  ]
                : {
                    paddingBottom: Math.max(
                      spacing.lg,
                      insets.bottom + spacing.md,
                    ),
                  },
            ]}
          >
            {selectedConversation ? (
              <>
                {!isDesktopWeb ? <View style={styles.menuHandle} /> : null}
                <Text numberOfLines={1} style={styles.menuTitle}>
                  {getConversationTitle(selectedConversation)}
                </Text>
                <Text numberOfLines={1} style={styles.menuSubtitle}>
                  {getLastMessageText(selectedConversation)}
                </Text>

                <View style={styles.menuActions}>
                  <Pressable
                    onPress={() => runConversationAction(togglePinConversation)}
                    style={styles.menuAction}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons
                        color={colors.primary}
                        name={
                          selectedConversation.isPinned
                            ? "pricetag"
                            : "pricetag-outline"
                        }
                        size={20}
                      />
                    </View>
                    <View style={styles.menuActionText}>
                      <Text style={styles.menuActionTitle}>
                        {selectedConversation.isPinned
                          ? "Bỏ ghim cuộc trò chuyện"
                          : "Ghim cuộc trò chuyện"}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      runConversationAction(markConversationReadLocal)
                    }
                    style={styles.menuAction}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons
                        color={colors.primary}
                        name="mail-open"
                        size={20}
                      />
                    </View>
                    <View style={styles.menuActionText}>
                      <Text style={styles.menuActionTitle}>
                        Đánh dấu đã đọc tất cả
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      runConversationAction(toggleMuteConversation)
                    }
                    style={styles.menuAction}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons
                        color={colors.primary}
                        name={
                          selectedConversation.isMuted
                            ? "notifications"
                            : "notifications-off"
                        }
                        size={20}
                      />
                    </View>
                    <View style={styles.menuActionText}>
                      <Text style={styles.menuActionTitle}>
                        {selectedConversation.isMuted
                          ? "Bật thông báo"
                          : "Tắt thông báo"}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSelectedConversation(null);
                      Alert.alert(
                        "Báo cáo",
                        "Chưa có API báo cáo cuộc trò chuyện từ backend.",
                      );
                    }}
                    style={styles.menuAction}
                  >
                    <View style={[styles.menuIcon, styles.reportMenuIcon]}>
                      <Ionicons color={colors.danger} name="flag" size={20} />
                    </View>
                    <View style={styles.menuActionText}>
                      <Text style={[styles.menuActionTitle, styles.reportText]}>
                        Báo cáo
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  empty: { alignItems: "center", gap: spacing.sm, justifyContent: "center" },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  footer: { padding: spacing.lg },
  header: {
    backgroundColor: "transparent",
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  heading: { color: colors.text, fontSize: 24, fontWeight: "900" },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  headerActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    width: 40,
  },
  primaryHeaderIconButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    elevation: 8,
    shadowOpacity: 0.62,
  },
  createRoomButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  createRoomText: {
    color: colors.primaryContrast,
    fontSize: 12,
    fontWeight: "900",
  },
  listContent: { paddingBottom: 112, paddingTop: spacing.xs },
  loading: { flex: 1, justifyContent: "center" },
  menuAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuActions: { marginTop: spacing.md },
  menuActionText: { flex: 1 },
  menuActionTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  menuHandle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 4,
    marginBottom: spacing.md,
    width: 42,
  },
  menuIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  menuOverlay: {
    backgroundColor: colors.visuals.rgb_15_23_42_0_32,
    flex: 1,
    justifyContent: "flex-end",
  },
  desktopMenuOverlay: {
    backgroundColor: "transparent",
    justifyContent: "flex-start",
  },
  desktopMenuSheet: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingBottom: spacing.md,
    position: "absolute",
    width: 320,
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  cameraWrap: {
    aspectRatio: 1,
    backgroundColor: colors.text,
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
  },
  permissionButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  permissionButtonText: {
    color: colors.primaryContrast,
    fontSize: 15,
    fontWeight: "900",
  },
  qrBody: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  qrHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  qrHelp: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  qrImageButton: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: colors.primary,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  qrImageButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  qrPermission: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl,
  },
  qrPermissionText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  qrResult: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    gap: spacing.sm,
    padding: spacing.md,
  },
  qrResultText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  qrScreen: { backgroundColor: colors.background, flex: 1 },
  qrTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  quickMenu: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 190,
    paddingVertical: spacing.xs,
    position: "absolute",
    right: spacing.lg,
  },
  quickMenuIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  quickMenuItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  quickMenuOverlay: { flex: 1 },
  quickMenuText: { color: colors.text, fontSize: 15, fontWeight: "800" },
  scanAgainText: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  scanFrame: {
    borderColor: colors.white,
    borderRadius: 14,
    borderWidth: 3,
    height: "58%",
    left: "21%",
    position: "absolute",
    top: "21%",
    width: "58%",
  },
  menuSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  menuTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  reportMenuIcon: { backgroundColor: colors.visuals.rgb_240_68_56_0_12 },
  reportText: { color: colors.danger },
  rowPressed: { opacity: 0.72 },
  screen: { backgroundColor: colors.background, flex: 1 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 42,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
