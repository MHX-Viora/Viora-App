import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { showAppToast } from "@/components/common/app-toast";
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
  ChatApiError,
  getConversation,
  getConversations,
  markConversationRead,
  setConversationMuted,
  setConversationPinned,
} from "@/services/chat.service";
import { getUser } from "@/stores/session-store";
import { colors, spacing } from "@/theme";
import type { Conversation } from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";
import { setChatUnreadCount } from "@/utils/chat-unread-count";

const PAGE_SIZE = 20;

const isConversationGoneError = (error: unknown) =>
  error instanceof ChatApiError &&
  (error.status === 404 || error.status === 410);

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const getLastMessageTime = (conversation: Conversation) => {
  const value = conversation.lastMessage?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const sortConversations = (items: Conversation[]) =>
  [...items].sort((left, right) => {
    if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
    return getLastMessageTime(right) - getLastMessageTime(left);
  });

const mergeConversations = (
  current: Conversation[],
  incoming: Conversation[],
) => {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return sortConversations(
    current
      .map((item) => byId.get(item.id) ?? item)
      .concat(
        incoming.filter((item) => !current.some((old) => old.id === item.id)),
      ),
  );
};

const getTitle = (conversation: Conversation) =>
  conversation.conversationType === "Private"
    ? (conversation.otherParticipant?.displayName ?? conversation.name)
    : conversation.name;

const getAvatar = (conversation: Conversation) =>
  conversation.conversationType === "Private"
    ? (conversation.otherParticipant?.avatarUrl ?? conversation.avatarUrl)
    : conversation.avatarUrl;

const getConversationRouteParams = (
  conversation: Conversation,
  scrollToMessageId?: string,
) => {
  const avatar = getAvatar(conversation);
  return {
    conversationAvatarUrl: avatar ?? "",
    conversationId: conversation.id,
    conversationName: getTitle(conversation),
    conversationType: conversation.conversationType,
    isMuted: String(conversation.isMuted),
    isPinned: String(conversation.isPinned),
    isVerified: String(conversation.otherParticipant?.isVerified ?? false),
    memberCount: String(conversation.memberCount ?? ""),
    otherAvatarUrl: conversation.otherParticipant?.avatarUrl ?? "",
    otherUserId: conversation.otherParticipant?.id ?? "",
    otherUserName: conversation.otherParticipant?.displayName ?? "",
    role: String(conversation.role ?? 0),
    scrollToMessageId,
  };
};

const getLastMessageText = (conversation: Conversation) => {
  const lastMessage = conversation.lastMessage;
  if (!lastMessage) return "Chưa có tin nhắn.";

  if (lastMessage.isDeleted || lastMessage.messageType === 7) {
    return `${lastMessage.isMine ? "Bạn: " : ""}Tin nhắn đã được thu hồi`;
  }

  const content = lastMessage.content.trim();
  if (content) return `${lastMessage.isMine ? "Bạn: " : ""}${content}`;

  const attachmentType = lastMessage.attachments[0]?.type;
  const mediaText =
    attachmentType === "image" || lastMessage.messageType === 1
      ? "Ảnh"
      : attachmentType === "video" || lastMessage.messageType === 2
        ? "Video"
        : attachmentType === "audio" || lastMessage.messageType === 4
          ? "Âm thanh"
          : attachmentType === "file" || lastMessage.messageType === 3
            ? "Tài liệu"
            : "Tin nhắn";

  return `${lastMessage.isMine ? "Bạn: " : ""}${mediaText}`;
};

function ConversationRow({
  conversation,
  isPinLoading,
  onOpen,
  onOpenMenu,
}: {
  conversation: Conversation;
  isPinLoading: boolean;
  onOpen: (conversation: Conversation) => void;
  onOpenMenu: (conversation: Conversation) => void;
}) {
  const title = getTitle(conversation);
  const avatar = getAvatar(conversation);
  const isPrivate = conversation.conversationType === "Private";
  const otherParticipant = conversation.otherParticipant;
  const showVerified = isPrivate && otherParticipant?.isVerified === true;
  const showStrangerBadge = isPrivate && otherParticipant?.isStranger === true;

  return (
    <Pressable
      accessibilityRole="button"
      onLongPress={() => onOpenMenu(conversation)}
      onPress={() => onOpen(conversation)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons
            color={colors.primary}
            name="chatbubble-ellipses"
            size={22}
          />
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {showVerified ? (
            <Ionicons
              color={colors.primary}
              name="checkmark-circle"
              size={16}
            />
          ) : null}
          {conversation.isMuted && (
            <Ionicons
              color={colors.textMuted}
              name="notifications-off"
              size={18}
            />
          )}
        </View>
        {showStrangerBadge ? (
          <View style={styles.strangerBadge}>
            <Text style={styles.strangerBadgeText}>Người lạ</Text>
          </View>
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            styles.preview,
            conversation.unreadCount > 0 && styles.unreadPreview,
          ]}
        >
          {getLastMessageText(conversation)}
        </Text>
      </View>
      <View style={styles.meta}>
        {conversation.isPinned && (
          <Ionicons color={colors.primary} name="pricetag" size={15} />
        )}
        <Text style={styles.time}>
          {conversation.lastMessage
            ? formatChatTime(conversation.lastMessage.createdAt)
            : ""}
        </Text>
        {conversation.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </Text>
          </View>
        )}
        {isPinLoading && (
          <ActivityIndicator color={colors.primary} size="small" />
        )}
      </View>
    </Pressable>
  );
}

export function ConversationsScreen() {
  const insets = useSafeAreaInsets();
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
  const [quickMenuVisible, setQuickMenuVisible] = useState(false);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [qrScanMessage, setQrScanMessage] = useState("");
  const [qrScanning, setQrScanning] = useState(true);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [openedConversationId, setOpenedConversationId] = useState("");
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(
    () => new Set(),
  );

  const requestedConversationId = firstParam(params.conversationId);
  const requestedMessageId = firstParam(params.scrollToMessageId);

  useEffect(() => {
    getUser().then((user) => setCurrentUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    setChatUnreadCount(
      items.reduce((total, item) => total + item.unreadCount, 0),
    );
  }, [items]);

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

  const handleGroupQrScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!qrScanning) return;
      setQrScanning(false);
      const trimmed = data.trim();
      const conversationId =
        trimmed.match(/^viora:\/\/chat\/group\/([^/?#]+)/i)?.[1] ??
        trimmed.match(/^viora:\/\/group\/([^/?#]+)/i)?.[1] ??
        trimmed.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)?.[0] ??
        "";

      if (!conversationId) {
        setQrScanMessage("Mã QR nhóm không hợp lệ.");
        return;
      }

      setQrScanMessage("Đã tìm thấy nhóm.");
      setTimeout(() => {
        closeQrScanner();
        router.push({
          pathname: "/chat/[conversationId]",
          params: { conversationId, conversationType: "Group" },
        });
      }, 450);
    },
    [closeQrScanner, qrScanning],
  );

  const load = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      if (mode === "more") setIsLoadingMore(true);
      try {
        const result = await getConversations({
          keyword: debouncedKeyword,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        setItems((current) =>
          nextPage === 1
            ? sortConversations(result.items)
            : mergeConversations(current, result.items),
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        setError("");
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

  useEffect(() => {
    load(1, "initial");
  }, [load]);

  useEffect(() => {
    if (
      !requestedConversationId ||
      openedConversationId === requestedConversationId
    ) {
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
  }, [items, openConversation, openedConversationId, requestedConversationId]);

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

  const openConversationMenu = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
  }, []);

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
              <Ionicons color={colors.white} name="add" size={24} />
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
                Viora cần quyền camera để quét mã QR nhóm.
              </Text>
              <Pressable onPress={requestCameraPermission} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Cho phép camera</Text>
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
          style={styles.menuOverlay}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.menuSheet,
              {
                paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.md),
              },
            ]}
          >
            {selectedConversation ? (
              <>
                <View style={styles.menuHandle} />
                <Text numberOfLines={1} style={styles.menuTitle}>
                  {getTitle(selectedConversation)}
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

const styles = StyleSheet.create({
  avatar: { borderRadius: 28, height: 56, width: 56 },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 999,
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  empty: { alignItems: "center", gap: spacing.sm, justifyContent: "center" },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  footer: { padding: spacing.lg },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  heading: { color: colors.text, fontSize: 28, fontWeight: "900" },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  headerActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  primaryHeaderIconButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  createRoomText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  listContent: { paddingBottom: 112 },
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
    backgroundColor: "rgba(15, 23, 42, 0.32)",
    flex: 1,
    justifyContent: "flex-end",
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
    color: colors.white,
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
  qrScreen: { backgroundColor: colors.white, flex: 1 },
  qrTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  quickMenu: {
    backgroundColor: colors.white,
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
  meta: { alignItems: "flex-end", gap: 4, minWidth: 42 },
  preview: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  reportMenuIcon: { backgroundColor: "rgba(240, 68, 56, 0.12)" },
  reportText: { color: colors.danger },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 82,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowBody: { flex: 1, gap: 4 },
  rowPressed: { opacity: 0.72 },
  screen: { backgroundColor: colors.background, flex: 1 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
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
  strangerBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  strangerBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  time: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  title: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "800" },
  titleLine: { alignItems: "center", flexDirection: "row", gap: 3 },
  unreadPreview: { color: colors.text, fontWeight: "800" },
});
