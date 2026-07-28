import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppToast } from "@/components/common/app-toast";
import { emitRealtimeSyncRequest } from "@/features/chat/chat-events";
import {
  ChatApiError,
  getGroupPreview,
  joinGroup,
} from "@/services/chat.service";
import { spacing } from "@/theme";
import type { ChatGroupPreview, ChatGroupPreviewMember } from "@/types/chat";
import { type ThemeColors, useTheme } from "@/theme";


const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

function PreviewMemberRow({ member }: { member: ChatGroupPreviewMember }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.memberRow}>
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatar} />
      ) : (
        <View style={styles.memberAvatarFallback}>
          <Ionicons color={colors.primary} name="person" size={18} />
        </View>
      )}
      <View style={styles.memberInfo}>
        <View style={styles.nameLine}>
          <Text numberOfLines={1} style={styles.memberName}>
            {member.displayName}
          </Text>
          {member.isVerified ? (
            <Ionicons color={colors.verified} name="checkmark-circle" size={15} />
          ) : null}
        </View>
      </View>
      {member.isFriend ? (
        <View style={styles.friendBadge}>
          <Ionicons color={colors.primary} name="people" size={13} />
          <Text style={styles.friendBadgeText}>Bạn bè</Text>
        </View>
      ) : null}
    </View>
  );
}

function SkeletonBlock({ style }: { style: object }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={[styles.skeleton, style]} />;
}

function GroupPreviewSkeleton() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.content}>
      <SkeletonBlock style={styles.skeletonAvatar} />
      <SkeletonBlock style={styles.skeletonTitle} />
      <SkeletonBlock style={styles.skeletonCount} />
      <View style={styles.memberList}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={styles.skeletonRow}>
            <SkeletonBlock style={styles.skeletonMemberAvatar} />
            <View style={styles.skeletonMemberText}>
              <SkeletonBlock style={styles.skeletonName} />
              <SkeletonBlock style={styles.skeletonMeta} />
            </View>
          </View>
        ))}
      </View>
      <SkeletonBlock style={styles.skeletonButton} />
    </View>
  );
}

export function GroupPreviewScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    groupId?: string | string[];
    inviteCode?: string | string[];
  }>();
  const inviteCode = useMemo(
    () => firstParam(params.inviteCode).trim(),
    [params.inviteCode],
  );
  const identifier = useMemo(
    () => firstParam(params.groupId).trim() || inviteCode,
    [params.groupId, inviteCode],
  );
  const [preview, setPreview] = useState<ChatGroupPreview | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const openChat = useCallback((conversationId: string) => {
    router.replace({
      pathname: "/chat/[conversationId]",
      params: { conversationId, conversationType: "Group" },
    });
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!identifier) {
        setError("Không tìm thấy mã nhóm.");
        setIsLoading(false);
        return;
      }
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      try {
        const result = await getGroupPreview(
          identifier,
          inviteCode ? "inviteCode" : "groupId",
        );
        setPreview(result);
        setRequestSent(false);
        setError("");
      } catch (loadError) {
        if (loadError instanceof ChatApiError && loadError.status === 404) {
          setError("Nhóm không tồn tại hoặc đã bị giải tán.");
        } else {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải thông tin nhóm.",
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [identifier, inviteCode],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const handleAction = useCallback(async () => {
    if (!preview || requestSent) return;
    if (preview.isJoined) {
      openChat(preview.conversationId);
      return;
    }

    const code = inviteCode || preview.inviteCode || identifier;
    if (!code) {
      showAppToast({ message: "Không tìm thấy mã mời nhóm.", type: "error" });
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinGroup(code);
      if (result.status === "pending") {
        setRequestSent(true);
        showAppToast({ message: "Đã gửi yêu cầu tham gia.", type: "success" });
        return;
      }

      showAppToast({ message: "Đã tham gia nhóm.", type: "success" });
      emitRealtimeSyncRequest();
      openChat(result.conversationId || preview.conversationId);
    } catch (joinError) {
      if (joinError instanceof ChatApiError && joinError.status === 409) {
        showAppToast({ message: "Bạn đã tham gia nhóm.", type: "success" });
        emitRealtimeSyncRequest();
        openChat(preview.conversationId);
        return;
      }
      if (joinError instanceof ChatApiError && joinError.status === 404) {
        setError("Nhóm không tồn tại hoặc đã bị giải tán.");
        return;
      }
      if (joinError instanceof ChatApiError && joinError.status === 403) {
        showAppToast({
          message: "Bạn không thể tham gia nhóm này.",
          type: "error",
        });
        return;
      }
      showAppToast({
        message: "Kết nối thất bại. Vui lòng thử lại.",
        type: "error",
      });
    } finally {
      setIsJoining(false);
    }
  }, [inviteCode, openChat, preview, requestSent]);

  const hiddenMemberCount = preview
    ? Math.max(0, preview.memberCount - preview.members.length)
    : 0;
  const isMissingGroupError = error.includes("không tồn tại") || error.includes("giải tán");
  const actionText = requestSent
    ? "Đã gửi yêu cầu"
    : preview?.isJoined
      ? "Mở cuộc trò chuyện"
      : "Tham gia nhóm";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Xem trước nhóm</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <GroupPreviewSkeleton />
      ) : error ? (
        <ScrollView
          contentContainerStyle={styles.errorContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void load("refresh")} />
          }
        >
          <Ionicons color={colors.textMuted} name="alert-circle-outline" size={44} />
          <Text style={styles.errorText}>{error}</Text>
                    {isMissingGroupError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Quay lại</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => void load("initial")}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          )}
        </ScrollView>
      ) : preview ? (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(spacing.xl * 4, insets.bottom + 104) },
            ]}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => void load("refresh")} />
            }
          >
            {preview.avatarUrl ? (
              <Image source={{ uri: preview.avatarUrl }} style={styles.groupAvatar} />
            ) : (
              <View style={styles.groupAvatarFallback}>
                <Ionicons color={colors.primary} name="people" size={42} />
              </View>
            )}
            <Text numberOfLines={2} style={styles.groupName}>
              {preview.name}
            </Text>
            <Text style={styles.memberCount}>{preview.memberCount} thành viên</Text>

            <View style={styles.memberList}>
              {preview.members.length > 0 ? (
                preview.members.map((member) => (
                  <PreviewMemberRow key={member.id} member={member} />
                ))
              ) : (
                <Text style={styles.emptyText}>Chưa có thành viên xem trước.</Text>
              )}
            </View>
            {hiddenMemberCount > 0 ? (
              <Text style={styles.moreMembers}>
                và {hiddenMemberCount} thành viên khác...
              </Text>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(spacing.md, insets.bottom + spacing.sm) },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              disabled={requestSent || isJoining}
              onPress={() => void handleAction()}
              style={[
                styles.actionButton,
                (requestSent || isJoining) && styles.actionButtonDisabled,
              ]}
            >
              <Text style={styles.actionText}>
                {isJoining ? "Đang xử lý..." : actionText}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 48,
  },
  actionButtonDisabled: { opacity: 0.62 },
  actionText: { color: colors.white, fontSize: 16, fontWeight: "900" },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  content: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.lg,
    textAlign: "center",
  },
  errorContent: {
    alignItems: "center",
    flexGrow: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    textAlign: "center",
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  friendBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  friendBadgeText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  groupAvatar: {
    borderRadius: 56,
    height: 112,
    width: 112,
  },
  groupAvatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 56,
    height: 112,
    justifyContent: "center",
    width: 112,
  },
  groupName: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerSpacer: { width: 40 },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
  memberAvatar: {
    borderRadius: 23,
    height: 46,
    width: 46,
  },
  memberAvatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  memberCount: { color: colors.textMuted, fontSize: 15, fontWeight: "800" },
  memberInfo: { flex: 1, minWidth: 0 },
  memberList: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  memberName: { color: colors.text, flexShrink: 1, fontSize: 15, fontWeight: "900" },
  memberRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 66,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  moreMembers: { color: colors.textMuted, fontSize: 14, fontWeight: "800" },
  nameLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  screen: { backgroundColor: colors.background, flex: 1 },
  skeleton: { backgroundColor: colors.border, borderRadius: 8 },
  skeletonAvatar: { borderRadius: 56, height: 112, width: 112 },
  skeletonButton: { alignSelf: "stretch", height: 48, marginTop: spacing.lg },
  skeletonCount: { height: 16, width: 120 },
  skeletonMemberAvatar: { borderRadius: 23, height: 46, width: 46 },
  skeletonMemberText: { flex: 1, gap: spacing.sm },
  skeletonMeta: { height: 12, width: "34%" },
  skeletonName: { height: 16, width: "68%" },
  skeletonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  skeletonTitle: { height: 28, width: "62%" },
});
