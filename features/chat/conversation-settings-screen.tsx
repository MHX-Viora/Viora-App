import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { AddMembersModal } from "@/components/chat/add-members-modal";
import { showAppToast } from "@/components/common/app-toast";
import {
  emitRealtimeConversation,
  emitRealtimeConversationBlockedChanged,
  emitRealtimeConversationMutedChanged,
  emitRealtimeConversationPinnedChanged,
  emitRealtimeSyncRequest,
  subscribeRealtimeConversationBlockedChanges,
  subscribeRealtimeConversationMutedChanges,
  subscribeRealtimeConversationPinnedChanges,
} from "@/features/chat/chat-events";
import { openProfileByUserId } from "@/features/profile/open-profile";
import {
  ChatApiError,
  getConversation,
  getGroupDetails,
  deleteGroupConversation,
  getGroupMembers,
  leaveConversation,
  setConversationBlocked,
  setConversationMuted,
  setConversationPinned,
  updateGroupAvatar,
  updateGroupName,
  updateGroupPermission,
  transferGroupOwner,
} from "@/services/chat.service";
import { getUser } from "@/stores/session-store";
import { colors, spacing } from "@/theme";
import type { ChatGroupMember, Conversation } from "@/types/chat";

type LoadingKey =
  | "pin"
  | "mute"
  | "block"
  | "leave"
  | "name"
  | "avatar"
  | "permission"
  | "delete";

const isGroupConversation = (conversation: Conversation) =>
  conversation.conversationType === "Group";

const isPrivateConversation = (conversation: Conversation) =>
  conversation.conversationType === "Private";

const canManageGroup = (conversation: Conversation) =>
  isGroupConversation(conversation) &&
  (conversation.role === 1 || conversation.role === 2);

const isGroupOwner = (conversation: Conversation) =>
  isGroupConversation(conversation) && conversation.role === 2;

const getConversationName = (conversation: Conversation) =>
  isPrivateConversation(conversation)
    ? (conversation.otherParticipant?.displayName ?? conversation.name)
    : conversation.name;

const getConversationAvatar = (conversation: Conversation) =>
  isPrivateConversation(conversation)
    ? (conversation.otherParticipant?.avatarUrl ?? conversation.avatarUrl)
    : conversation.avatarUrl;

const getPermissionLabel = (value?: boolean | number) => {
  if (typeof value !== "number") return "Mọi người";
  if (value === 1) return "Quản trị viên và chủ nhóm";
  if (value === 2) return "Chỉ chủ nhóm";
  return "Mọi người";
};

const toParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const normalizeConversationId = (value: string) =>
  value.replace(/-(attachments|links|report|search)(?:-|$).*/, "");

function Section({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingRow({
  danger,
  icon,
  isLoading,
  onPress,
  right,
  title,
}: {
  danger?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  isLoading?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress || isLoading}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
        <Ionicons
          color={danger ? colors.danger : colors.primary}
          name={icon}
          size={20}
        />
      </View>
      <Text style={[styles.rowTitle, danger && styles.dangerText]}>
        {title}
      </Text>
      {isLoading ? (
        <ActivityIndicator color={danger ? colors.danger : colors.primary} />
      ) : (
        right ?? <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
      )}
    </Pressable>
  );
}

function SettingsSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRow} />
      </View>
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRow} />
      </View>
    </View>
  );
}

export function ConversationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    conversationAvatarUrl?: string | string[];
    conversationId?: string | string[];
    conversationName?: string | string[];
    conversationType?: "Private" | "Group" | string | string[];
    isBlocked?: string | string[];
    isMuted?: string | string[];
    isPinned?: string | string[];
    memberCount?: string | string[];
    otherAvatarUrl?: string | string[];
    otherUserId?: string | string[];
    otherUserName?: string | string[];
    role?: string | string[];
  }>();
  const conversationId = normalizeConversationId(toParam(params.conversationId));
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<LoadingKey | null>(null);
  const [addMembersVisible, setAddMembersVisible] = useState(false);
  const [groupDetailsLoaded, setGroupDetailsLoaded] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [nextGroupName, setNextGroupName] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [ownerPickerVisible, setOwnerPickerVisible] = useState(false);
  const [shareGroupVisible, setShareGroupVisible] = useState(false);
  const [ownerCandidates, setOwnerCandidates] = useState<ChatGroupMember[]>([]);
  const [ownerPickerLoading, setOwnerPickerLoading] = useState(false);
  const [ownerTransferLoadingId, setOwnerTransferLoadingId] = useState<string | null>(null);

  const routeConversation = useMemo<Conversation | null>(() => {
    if (!conversationId) return null;
    const conversationType =
      toParam(params.conversationType) === "Group" ? "Group" : "Private";
    const otherUserId = toParam(params.otherUserId);
    const otherUserName = toParam(params.otherUserName);
    const otherAvatarUrl = toParam(params.otherAvatarUrl);

    return {
      avatarUrl: toParam(params.conversationAvatarUrl) || null,
      conversationType,
      id: conversationId,
      isBlocked: toParam(params.isBlocked) === "true",
      isMuted: toParam(params.isMuted) === "true",
      isPinned: toParam(params.isPinned) === "true",
      lastMessage: null,
      memberCount: Number(toParam(params.memberCount)) || 0,
      name: toParam(params.conversationName) || "Cuộc trò chuyện",
      otherParticipant: otherUserId
        ? {
            avatarUrl: otherAvatarUrl || null,
            displayName: otherUserName || "Người dùng",
            id: otherUserId,
          }
        : null,
      role: Number(toParam(params.role)) || 0,
      unreadCount: 0,
    };
  }, [
    conversationId,
    params.conversationAvatarUrl,
    params.conversationName,
    params.conversationType,
    params.isBlocked,
    params.isMuted,
    params.isPinned,
    params.memberCount,
    params.otherAvatarUrl,
    params.otherUserId,
    params.otherUserName,
    params.role,
  ]);

  const canManageLoadedGroup =
    groupDetailsLoaded && conversation ? canManageGroup(conversation) : false;
  const isLoadedGroupOwner =
    groupDetailsLoaded && conversation ? isGroupOwner(conversation) : false;

  const load = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const isGroup = routeConversation?.conversationType === "Group";
      setGroupDetailsLoaded(false);
      const loadedConversation = isGroup
        ? await getGroupDetails(conversationId)
        : await getConversation(conversationId);
      setConversation({
        ...loadedConversation,
        role: loadedConversation.role ?? routeConversation?.role ?? 0,
      });
      setGroupDetailsLoaded(isGroup);
      setError("");
    } catch (loadError) {
      if (routeConversation) {
        setConversation(routeConversation);
        setGroupDetailsLoaded(false);
        setError("");
        return;
      }
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải cài đặt cuộc trò chuyện.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, routeConversation]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    getUser().then((user) => setCurrentUserId(user?.id ?? ""));
  }, []);

  useEffect(
    () =>
      subscribeRealtimeConversationPinnedChanges((event) => {
        if (event.conversationId !== conversationId) return;
        setConversation((current) =>
          current ? { ...current, isPinned: event.isPinned } : current,
        );
      }),
    [conversationId],
  );

  useEffect(
    () =>
      subscribeRealtimeConversationMutedChanges((event) => {
        if (event.conversationId !== conversationId) return;
        setConversation((current) =>
          current ? { ...current, isMuted: event.isMuted } : current,
        );
      }),
    [conversationId],
  );

  useEffect(
    () =>
      subscribeRealtimeConversationBlockedChanges((event) => {
        if (event.conversationId !== conversationId) return;
        setConversation((current) =>
          current ? { ...current, isBlocked: event.isBlocked } : current,
        );
      }),
    [conversationId],
  );

  const avatarUrl = conversation ? getConversationAvatar(conversation) : null;
  const title = useMemo(
    () => (conversation ? getConversationName(conversation) : ""),
    [conversation],
  );
  const groupShareLink =
    conversation && isGroupConversation(conversation)
      ? `viora://chat/group/${conversation.id}`
      : "";
  const otherProfileUserId = useMemo(
    () => conversation?.otherParticipant?.id || toParam(params.otherUserId),
    [conversation, params.otherUserId],
  );

  const runAction = useCallback(
    async (
      key: LoadingKey,
      request: () => Promise<void>,
      onSuccess: () => void,
      fallback: string,
    ) => {
      if (loading) return;
      setLoading(key);
      try {
        await request();
        onSuccess();
      } catch (actionError) {
        Alert.alert(
          fallback,
          actionError instanceof Error ? actionError.message : "Vui lòng thử lại.",
        );
      } finally {
        setLoading(null);
      }
    },
    [loading],
  );

  const togglePin = useCallback(
    (next: boolean) => {
      if (!conversation) return;
      void runAction(
        "pin",
        () => setConversationPinned(conversation.id, next),
        () => {
          setConversation((current) =>
            current ? { ...current, isPinned: next } : current,
          );
          emitRealtimeConversationPinnedChanged({
            conversationId: conversation.id,
            isPinned: next,
          });
        },
        "Không thể cập nhật ghim",
      );
    },
    [conversation, runAction],
  );

  const toggleMute = useCallback(
    (next: boolean) => {
      if (!conversation) return;
      void runAction(
        "mute",
        () => setConversationMuted(conversation.id, next),
        () => {
          setConversation((current) =>
            current ? { ...current, isMuted: next } : current,
          );
          emitRealtimeConversationMutedChanged({
            conversationId: conversation.id,
            isMuted: next,
          });
        },
        "Không thể cập nhật thông báo",
      );
    },
    [conversation, runAction],
  );

  const toggleBlock = useCallback(() => {
    if (!conversation) return;
    const next = !conversation.isBlocked;
    void runAction(
      "block",
      () => setConversationBlocked(conversation.id, next),
      () => {
        setConversation((current) =>
          current ? { ...current, isBlocked: next } : current,
        );
        emitRealtimeConversationBlockedChanged({
          conversationId: conversation.id,
          isBlocked: next,
        });
      },
      "Không thể cập nhật chặn",
    );
  }, [conversation, runAction]);

  const openRenameGroup = useCallback(() => {
    if (!conversation || !isGroupConversation(conversation)) return;
    setNextGroupName(conversation.name);
    setRenameVisible(true);
  }, [conversation]);

  const submitRenameGroup = useCallback(() => {
    if (!conversation || !isGroupConversation(conversation)) return;
    const name = nextGroupName.trim();
    if (!name) {
      Alert.alert("Thiếu tên nhóm", "Vui lòng nhập tên nhóm.");
      return;
    }

    void runAction(
      "name",
      async () => {
        const updated = await updateGroupName(conversation.id, name);
        const updatedConversation = { ...conversation, name: updated.name };
        setConversation(updatedConversation);
        emitRealtimeConversation(updatedConversation);
        setRenameVisible(false);
      },
      () => undefined,
      "Không thể đổi tên nhóm",
    );
  }, [conversation, nextGroupName, runAction]);

  const changeGroupAvatar = useCallback(async () => {
    if (!conversation || !isGroupConversation(conversation) || loading) return;

    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập",
          "Hãy cho phép Viora truy cập thư viện để chọn ảnh nhóm.",
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;

    void runAction(
      "avatar",
      async () => {
        const updated = await updateGroupAvatar(
          conversation.id,
          result.assets[0].uri,
        );
        const updatedConversation = {
          ...conversation,
          avatarUrl: updated.avatarUrl,
        };
        setConversation(updatedConversation);
        emitRealtimeConversation(updatedConversation);
      },
      () => undefined,
      "Không thể đổi ảnh nhóm",
    );
  }, [conversation, loading, runAction]);

  const updatePermission = useCallback(
    (canSendMessage: number) => {
      if (!conversation || !isGroupConversation(conversation)) return;
      void runAction(
        "permission",
        async () => {
          const updatedPermission = await updateGroupPermission(
            conversation.id,
            canSendMessage,
          );
          const updatedConversation = {
            ...conversation,
            canSendMessage: updatedPermission.canSendMessage,
          };
          setConversation(updatedConversation);
          emitRealtimeConversation(updatedConversation);
        },
        () => undefined,
        "Không thể cập nhật quyền gửi tin nhắn",
      );
    },
    [conversation, runAction],
  );

  const openPermissionPicker = useCallback(() => {
    if (!conversation || !isGroupConversation(conversation) || loading) return;
    Alert.alert("Quyền gửi tin nhắn", "Ai có thể gửi tin nhắn trong nhóm?", [
      { text: "Hủy", style: "cancel" },
      { onPress: () => updatePermission(0), text: "Mọi người" },
      { onPress: () => updatePermission(1), text: "Quản trị viên và chủ nhóm" },
      { onPress: () => updatePermission(2), text: "Chỉ chủ nhóm" },
    ]);
  }, [conversation, loading, updatePermission]);

  const shareGroupLink = useCallback(async () => {
    if (!groupShareLink) return;
    try {
      await Share.share({
        message: `Tham gia nhóm Viora: ${title}\n${groupShareLink}`,
        url: groupShareLink,
      });
    } catch (error) {
      Alert.alert(
        "Không thể chia sẻ nhóm",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  }, [groupShareLink, title]);

  const handleLeaveSuccess = useCallback(() => {
    emitRealtimeSyncRequest();
    showAppToast({ message: "Đã rời khỏi nhóm", type: "success" });
    router.replace("/(tabs)/chat");
  }, []);

  const openOwnerPicker = useCallback(async () => {
    if (!conversation) return;
    setOwnerPickerVisible(true);
    setOwnerPickerLoading(true);
    try {
      const result = await getGroupMembers(conversation.id, {
        page: 1,
        pageSize: 100,
      });
      setOwnerCandidates(
        result.items.filter((member) => member.id !== currentUserId),
      );
    } catch (error) {
      Alert.alert(
        "Không thể tải thành viên",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setOwnerPickerLoading(false);
    }
  }, [conversation, currentUserId]);

  const leaveGroup = useCallback(async () => {
    if (!conversation || loading === "leave") return;
    setLoading("leave");
    try {
      await leaveConversation(conversation.id);
      handleLeaveSuccess();
    } catch (error) {
      if (error instanceof ChatApiError) {
        if (error.status === 409) {
          Alert.alert(
            "Cần chuyển quyền trưởng nhóm",
            "Bạn cần chuyển quyền trưởng nhóm trước khi rời nhóm.",
            [{ text: "Chọn trưởng nhóm mới", onPress: () => void openOwnerPicker() }],
          );
          return;
        }
        if (error.status === 403) {
          Alert.alert("Rời nhóm", "Bạn không có quyền thực hiện thao tác này.");
          return;
        }
        if (error.status === 404) {
          Alert.alert("Rời nhóm", "Không tìm thấy nhóm.");
          return;
        }
      }
      Alert.alert(
        "Không thể rời nhóm",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setLoading(null);
    }
  }, [conversation, handleLeaveSuccess, loading, openOwnerPicker]);

  const confirmLeaveGroup = useCallback(() => {
    if (!conversation || !isGroupConversation(conversation)) return;
    Alert.alert(
      "Rời khỏi nhóm?",
      "Bạn sẽ không thể xem hoặc gửi tin nhắn trong nhóm này.",
      [
        { text: "Hủy", style: "cancel" },
        {
          onPress: () => void leaveGroup(),
          style: "destructive",
          text: "Rời nhóm",
        },
      ],
    );
  }, [conversation, leaveGroup]);

  const confirmDeleteGroup = useCallback(() => {
    if (!conversation || !isGroupOwner(conversation)) return;
    Alert.alert(
      "Giải tán nhóm",
      "Bạn có chắc muốn giải tán nhóm này? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          onPress: () =>
            void runAction(
              "delete",
              () => deleteGroupConversation(conversation.id),
              () => {
                emitRealtimeSyncRequest();
                router.replace("/(tabs)/chat");
              },
              "Không thể giải tán nhóm",
            ),
          style: "destructive",
          text: "Giải tán",
        },
      ],
    );
  }, [conversation, runAction]);

  const transferOwnerAndLeave = useCallback(
    async (member: ChatGroupMember) => {
      if (!conversation || ownerTransferLoadingId) return;
      setOwnerTransferLoadingId(member.id);
      try {
        await transferGroupOwner(conversation.id, member.id);
        setOwnerPickerVisible(false);
        await leaveConversation(conversation.id);
        handleLeaveSuccess();
      } catch (error) {
        Alert.alert(
          "Không thể chuyển quyền trưởng nhóm",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        setOwnerTransferLoadingId(null);
      }
    },
    [conversation, handleLeaveSuccess, ownerTransferLoadingId],
  );

  const openReport = useCallback(() => {
    router.push({
      pathname: "/chat/settings/[conversationId]-report",
      params: { conversationId },
    });
  }, [conversationId]);

  const openAttachments = useCallback(() => {
    const targetConversationId = conversation?.id ?? conversationId;
    if (!targetConversationId) return;
    router.push({
      pathname: "/chat/settings/attachments",
      params: { conversationId: targetConversationId, type: "0" },
    });
  }, [conversation, conversationId]);

  const openLinks = useCallback(() => {
    const targetConversationId = conversation?.id ?? conversationId;
    if (!targetConversationId) return;
    router.push({
      pathname: "/chat/settings/links",
      params: { conversationId: targetConversationId },
    });
  }, [conversation, conversationId]);

  const openMembers = useCallback(() => {
    const targetConversationId = conversation?.id ?? conversationId;
    if (!targetConversationId) return;
    router.push({
      pathname: "/chat/settings/members",
      params: {
        conversationId: targetConversationId,
        role: String(conversation?.role ?? 0),
      },
    });
  }, [conversation, conversationId]);

  const openOtherProfile = useCallback(() => {
    if (!otherProfileUserId) {
      Alert.alert("Không thể mở trang cá nhân", "Không tìm thấy người dùng trong cuộc trò chuyện này.");
      return;
    }
    void openProfileByUserId(router, otherProfileUserId);
  }, [otherProfileUserId]);

  const openCreateGroup = useCallback(() => {
    const defaultUserId =
      conversation?.otherParticipant?.id || toParam(params.otherUserId);
    if (!defaultUserId) {
      Alert.alert("Không thể tạo nhóm", "Không tìm thấy người dùng trong cuộc trò chuyện này.");
      return;
    }

    router.push({
      pathname: "/chat/create-group",
      params: {
        defaultAvatarUrl:
          conversation?.otherParticipant?.avatarUrl ??
          toParam(params.otherAvatarUrl),
        defaultIsVerified: String(
          conversation?.otherParticipant?.isVerified ?? false,
        ),
        defaultUserId,
        defaultUserName:
          conversation?.otherParticipant?.displayName ??
          toParam(params.otherUserName),
      },
    });
  }, [
    conversation,
    params.otherAvatarUrl,
    params.otherUserId,
    params.otherUserName,
  ]);

  const missing = (name: string) =>
    Alert.alert(name, "Chưa có màn hình/API từ backend.");

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
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          Cài đặt trò chuyện
        </Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <SettingsSkeleton />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryButton}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : conversation ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.xl) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.info}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons
                  color={colors.primary}
                  name={isGroupConversation(conversation) ? "people" : "person"}
                  size={36}
                />
              </View>
            )}
            <Text numberOfLines={2} style={styles.name}>
              {title}
            </Text>
            {isGroupConversation(conversation) ? (
              <Text style={styles.memberCount}>
                {conversation.memberCount ?? 0} thành viên
              </Text>
            ) : null}
          </View>

          <Section>
            <SettingRow
              icon="bookmark-outline"
              isLoading={loading === "pin"}
              right={
                <Switch
                  disabled={loading !== null}
                  onValueChange={togglePin}
                  value={conversation.isPinned}
                />
              }
              title="Ghim cuộc trò chuyện"
            />
            <SettingRow
              icon={conversation.isMuted ? "notifications-off-outline" : "notifications-outline"}
              isLoading={loading === "mute"}
              right={
                <Switch
                  disabled={loading !== null}
                  onValueChange={toggleMute}
                  value={conversation.isMuted}
                />
              }
              title="Tắt thông báo"
            />
          </Section>

          <Section title="Nội dung đã chia sẻ">
            <SettingRow
              icon="folder-open-outline"
              onPress={openAttachments}
              title="Ảnh, video, file, âm thanh"
            />
            <SettingRow
              icon="link-outline"
              onPress={openLinks}
              title="Liên kết"
            />
          </Section>

          {isPrivateConversation(conversation) ? (
            <Section>
              <SettingRow
                icon="person-circle-outline"
                onPress={openOtherProfile}
                title="Xem trang cá nhân"
              />
              <SettingRow
                icon="people-outline"
                onPress={openCreateGroup}
                title="Tạo nhóm"
              />
              <SettingRow
                danger={conversation.isBlocked}
                icon="ban-outline"
                isLoading={loading === "block"}
                onPress={toggleBlock}
                title={
                  conversation.isBlocked
                    ? "Bỏ chặn người dùng"
                    : "Chặn người dùng"
                }
              />
              <SettingRow
                danger
                icon="flag-outline"
                onPress={openReport}
                title="Báo cáo người dùng"
              />
            </Section>
          ) : null}

          {isGroupConversation(conversation) ? (
            <Section title="Quản lý nhóm">
              <SettingRow
                icon="people-outline"
                onPress={openMembers}
                title="Thành viên"
              />
              <SettingRow
                icon="qr-code-outline"
                onPress={() => setShareGroupVisible(true)}
                title="Chia sẻ nhóm"
              />
              {canManageLoadedGroup ? (
                <>
                  <SettingRow
                    icon="person-add-outline"
                    onPress={() => setAddMembersVisible(true)}
                    title="Thêm thành viên"
                  />
                  <SettingRow
                    icon="options-outline"
                    isLoading={loading === "permission"}
                    onPress={openPermissionPicker}
                    right={
                      <Text style={styles.rowValue}>
                        {getPermissionLabel(conversation.canSendMessage)}
                      </Text>
                    }
                    title="Quyền gửi tin nhắn"
                  />
                  <SettingRow
                    icon="create-outline"
                    isLoading={loading === "name"}
                    onPress={openRenameGroup}
                    title="Đổi tên nhóm"
                  />
                  <SettingRow
                    icon="camera-outline"
                    isLoading={loading === "avatar"}
                    onPress={changeGroupAvatar}
                    title="Đổi ảnh nhóm"
                  />
                </>
              ) : null}
            </Section>
          ) : null}

          {isGroupConversation(conversation) ? (
            <Pressable
              disabled={loading !== null}
              onPress={confirmLeaveGroup}
              style={({ pressed }) => [
                styles.leaveButton,
                pressed && styles.rowPressed,
                loading === "leave" && styles.disabledAction,
              ]}
            >
              {loading === "leave" ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons color={colors.white} name="log-out-outline" size={20} />
                  <Text style={styles.leaveText}>Rời nhóm</Text>
                </>
              )}
            </Pressable>
          ) : null}
          {isLoadedGroupOwner ? (
            <Pressable
              disabled={loading !== null}
              onPress={confirmDeleteGroup}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.rowPressed,
                loading === "delete" && styles.disabledAction,
              ]}
            >
              {loading === "delete" ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons color={colors.white} name="trash-outline" size={20} />
                  <Text style={styles.leaveText}>Giải tán nhóm</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}
      <AddMembersModal
        conversationId={conversation?.id ?? conversationId}
        onAdded={load}
        onClose={() => setAddMembersVisible(false)}
        visible={addMembersVisible}
      />
      <Modal
        animationType="slide"
        onRequestClose={() => setShareGroupVisible(false)}
        transparent
        visible={shareGroupVisible}
      >
        <Pressable
          onPress={() => setShareGroupVisible(false)}
          style={styles.shareOverlay}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.shareSheet}
          >
            <View style={styles.shareHandle} />
            <Text style={styles.shareTitle}>Chia sẻ nhóm</Text>
            <Text numberOfLines={1} style={styles.shareSubtitle}>
              {title}
            </Text>
            {groupShareLink ? (
              <>
                <View style={styles.groupQrBox}>
                  <QRCode
                    backgroundColor={colors.white}
                    color={colors.text}
                    size={190}
                    value={groupShareLink}
                  />
                </View>
                <TextInput
                  editable={false}
                  multiline
                  selectTextOnFocus
                  style={styles.shareLinkInput}
                  value={groupShareLink}
                />
                <Text style={styles.shareHint}>
                  Nhấn giữ đường dẫn để sao chép, hoặc chia sẻ cho bạn bè.
                </Text>
                <Pressable
                  onPress={() => void shareGroupLink()}
                  style={styles.shareButton}
                >
                  <Ionicons color={colors.white} name="share-social-outline" size={18} />
                  <Text style={styles.shareButtonText}>Chia sẻ đường dẫn</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => setOwnerPickerVisible(false)}
        visible={ownerPickerVisible}
      >
        <View style={styles.ownerPickerScreen}>
          <View style={styles.ownerPickerHeader}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setOwnerPickerVisible(false)}
              style={styles.iconButton}
            >
              <Ionicons color={colors.text} name="close" size={24} />
            </Pressable>
            <Text style={styles.ownerPickerTitle}>Chọn trưởng nhóm mới</Text>
            <View style={styles.iconButton} />
          </View>
          {ownerPickerLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              contentContainerStyle={[
                styles.ownerPickerList,
                ownerCandidates.length === 0 && styles.emptyOwnerCandidates,
              ]}
              data={ownerCandidates}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyOwnerText}>
                  Không có thành viên khác để chuyển quyền.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  disabled={ownerTransferLoadingId !== null}
                  onPress={() => void transferOwnerAndLeave(item)}
                  style={styles.ownerCandidateRow}
                >
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.ownerAvatar} />
                  ) : (
                    <View style={styles.ownerAvatarFallback}>
                      <Ionicons color={colors.primary} name="person" size={22} />
                    </View>
                  )}
                  <Text numberOfLines={1} style={styles.ownerName}>
                    {item.displayName}
                  </Text>
                  {ownerTransferLoadingId === item.id ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
                  )}
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
        transparent
        visible={renameVisible}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            onPress={() => setRenameVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Đổi tên nhóm</Text>
            <TextInput
              autoFocus
              onChangeText={setNextGroupName}
              placeholder="Tên nhóm"
              placeholderTextColor={colors.textMuted}
              style={styles.renameInput}
              value={nextGroupName}
            />
            <View style={styles.renameActions}>
              <Pressable
                disabled={loading === "name"}
                onPress={() => setRenameVisible(false)}
                style={styles.renameSecondary}
              >
                <Text style={styles.renameSecondaryText}>Hủy</Text>
              </Pressable>
              <Pressable
                disabled={loading === "name"}
                onPress={submitRenameGroup}
                style={styles.renamePrimary}
              >
                {loading === "name" ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.renamePrimaryText}>Lưu</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 44, height: 88, width: 88 },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 44,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  center: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl,
  },
  content: { gap: spacing.lg, padding: spacing.md },
  dangerIcon: { backgroundColor: "rgba(239, 71, 111, 0.12)" },
  dangerText: { color: colors.danger },
  disabledAction: { opacity: 0.65 },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  iconButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  info: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  leaveButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  leaveText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  memberCount: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.42)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  emptyOwnerCandidates: { flexGrow: 1, justifyContent: "center" },
  emptyOwnerText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  ownerAvatar: { borderRadius: 24, height: 48, width: 48 },
  ownerAvatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  ownerCandidateRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ownerName: { color: colors.text, flex: 1, fontSize: 15, fontWeight: "800" },
  ownerPickerHeader: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
  ownerPickerList: { backgroundColor: colors.surface, flexGrow: 1 },
  ownerPickerScreen: { backgroundColor: colors.surface, flex: 1 },
  ownerPickerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  renameActions: { flexDirection: "row", gap: spacing.sm },
  renameCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 360,
    padding: spacing.lg,
    width: "100%",
  },
  renameInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  renamePrimary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  renamePrimaryText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  renameSecondary: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  renameSecondaryText: { color: colors.text, fontSize: 14, fontWeight: "800" },
  renameTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  groupQrBox: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  shareButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 44,
  },
  shareButtonText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  shareHandle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 4,
    marginBottom: spacing.md,
    width: 42,
  },
  shareHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  shareLinkInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 58,
    padding: spacing.sm,
  },
  shareOverlay: {
    backgroundColor: "rgba(15, 23, 42, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  shareSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: spacing.md,
    padding: spacing.md,
  },
  shareSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  shareTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  rowPressed: { opacity: 0.72 },
  rowTitle: { color: colors.text, flex: 1, fontSize: 15, fontWeight: "800" },
  rowValue: { color: colors.textMuted, fontSize: 13, fontWeight: "800" },
  screen: { backgroundColor: colors.background, flex: 1 },
  section: { gap: spacing.sm },
  sectionBody: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    paddingHorizontal: spacing.xs,
    textTransform: "uppercase",
  },
  skeletonAvatar: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  skeletonContent: { gap: spacing.lg, padding: spacing.md },
  skeletonRow: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 54,
  },
  skeletonSection: { gap: spacing.sm },
  skeletonTitle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 20,
    width: 180,
  },
});
