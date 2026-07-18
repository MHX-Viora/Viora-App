import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  emitRealtimeConversationBlockedChanged,
  emitRealtimeConversationMutedChanged,
  emitRealtimeConversationPinnedChanged,
  subscribeRealtimeConversationBlockedChanges,
  subscribeRealtimeConversationMutedChanges,
  subscribeRealtimeConversationPinnedChanges,
} from "@/features/chat/chat-events";
import { openProfileByUserId } from "@/features/profile/open-profile";
import {
  getConversation,
  leaveConversation,
  setConversationBlocked,
  setConversationMuted,
  setConversationPinned,
} from "@/services/chat.service";
import { colors, spacing } from "@/theme";
import type { Conversation } from "@/types/chat";

type LoadingKey = "pin" | "mute" | "block" | "leave";

const isGroupConversation = (conversation: Conversation) =>
  conversation.conversationType === "Group";

const isPrivateConversation = (conversation: Conversation) =>
  conversation.conversationType === "Private";

const canManageGroup = (conversation: Conversation) =>
  isGroupConversation(conversation) &&
  (conversation.role === 1 || conversation.role === 2);

const getConversationName = (conversation: Conversation) =>
  isPrivateConversation(conversation)
    ? (conversation.otherParticipant?.displayName ?? conversation.name)
    : conversation.name;

const getConversationAvatar = (conversation: Conversation) =>
  isPrivateConversation(conversation)
    ? (conversation.otherParticipant?.avatarUrl ?? conversation.avatarUrl)
    : conversation.avatarUrl;

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
  }>();
  const conversationId = normalizeConversationId(toParam(params.conversationId));
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<LoadingKey | null>(null);

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
  ]);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      setConversation(await getConversation(conversationId));
      setError("");
    } catch (loadError) {
      if (routeConversation) {
        setConversation(routeConversation);
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

  const confirmLeaveGroup = useCallback(() => {
    if (!conversation || !isGroupConversation(conversation)) return;
    Alert.alert("Rời nhóm", "Bạn có chắc muốn rời nhóm này?", [
      { text: "Hủy", style: "cancel" },
      {
        onPress: () =>
          void runAction(
            "leave",
            () => leaveConversation(conversation.id),
            () => router.replace("/(tabs)/chat"),
            "Không thể rời nhóm",
          ),
        style: "destructive",
        text: "Rời nhóm",
      },
    ]);
  }, [conversation, runAction]);

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

  const openOtherProfile = useCallback(() => {
    if (!otherProfileUserId) {
      Alert.alert("Không thể mở trang cá nhân", "Không tìm thấy người dùng trong cuộc trò chuyện này.");
      return;
    }
    void openProfileByUserId(router, otherProfileUserId);
  }, [otherProfileUserId]);

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
                onPress={() => missing("Thành viên")}
                title="Thành viên"
              />
              {canManageGroup(conversation) ? (
                <>
                  <SettingRow
                    icon="person-add-outline"
                    onPress={() => missing("Quản lý thành viên")}
                    title="Quản lý thành viên"
                  />
                  <SettingRow
                    icon="options-outline"
                    onPress={() => missing("Quyền gửi tin nhắn")}
                    title="Quyền gửi tin nhắn"
                  />
                  <SettingRow
                    icon="create-outline"
                    onPress={() => missing("Đổi tên nhóm")}
                    title="Đổi tên nhóm"
                  />
                  <SettingRow
                    icon="camera-outline"
                    onPress={() => missing("Đổi ảnh nhóm")}
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
        </ScrollView>
      ) : null}
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
  leaveText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  memberCount: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
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
  rowPressed: { opacity: 0.72 },
  rowTitle: { color: colors.text, flex: 1, fontSize: 15, fontWeight: "800" },
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
