import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
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
import {
  getConversation,
  setConversationBlocked,
  setConversationMuted,
  setConversationPinned,
} from "@/services/chat.service";
import { colors, spacing } from "@/theme";
import type { Conversation } from "@/types/chat";

type LoadingKey = "pin" | "mute" | "block" | "clear" | "leave";

const showToast = (message: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert("Viora", message);
};

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingRow({
  danger,
  description,
  icon,
  isLoading,
  onPress,
  right,
  title,
}: {
  danger?: boolean;
  description?: string;
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
        <Ionicons color={danger ? colors.danger : colors.primary} name={icon} size={20} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      {isLoading ? (
        <ActivityIndicator color={danger ? colors.danger : colors.primary} />
      ) : (
        right ?? <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
      )}
    </Pressable>
  );
}

export function ConversationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { conversationId = "" } = useLocalSearchParams<{ conversationId?: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<LoadingKey | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!conversationId) return;
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      try {
        setConversation(await getConversation(conversationId));
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Khong the tai cai dat cuoc tro chuyen.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [conversationId],
  );

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

  const isPrivate = conversation?.conversationType === "Private";
  const title = useMemo(() => {
    if (!conversation) return "Cuoc tro chuyen";
    return conversation.conversationType === "Private"
      ? conversation.otherParticipant?.displayName ?? conversation.name
      : conversation.name;
  }, [conversation]);
  const avatarUrl =
    conversation?.conversationType === "Private"
      ? conversation.otherParticipant?.avatarUrl ?? conversation.avatarUrl
      : conversation?.avatarUrl;

  const patchLocal = useCallback((patch: Partial<Conversation>) => {
    setConversation((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const runToggle = useCallback(
    async (
      key: LoadingKey,
      patch: Partial<Conversation>,
      request: () => Promise<void>,
      rollback: Partial<Conversation>,
      errorTitle: string,
    ) => {
      if (loading || !conversation) return;
      setLoading(key);
      patchLocal(patch);
      try {
        await request();
      } catch (toggleError) {
        patchLocal(rollback);
        showToast(
          toggleError instanceof Error ? toggleError.message : errorTitle,
        );
      } finally {
        setLoading(null);
      }
    },
    [conversation, loading, patchLocal],
  );

  const togglePin = useCallback(() => {
    if (!conversation) return;
    const next = !conversation.isPinned;
    void runToggle(
      "pin",
      { isPinned: next },
      async () => {
        await setConversationPinned(conversation.id, next);
        emitRealtimeConversationPinnedChanged({
          conversationId: conversation.id,
          isPinned: next,
        });
      },
      { isPinned: conversation.isPinned },
      "Khong the cap nhat ghim",
    );
  }, [conversation, runToggle]);

  const toggleMute = useCallback(() => {
    if (!conversation) return;
    const next = !conversation.isMuted;
    void runToggle(
      "mute",
      { isMuted: next },
      async () => {
        await setConversationMuted(conversation.id, next);
        emitRealtimeConversationMutedChanged({
          conversationId: conversation.id,
          isMuted: next,
        });
      },
      { isMuted: conversation.isMuted },
      "Khong the cap nhat thong bao",
    );
  }, [conversation, runToggle]);

  const toggleBlock = useCallback(() => {
    if (!conversation) return;
    const next = !conversation.isBlocked;
    Alert.alert(
      next ? "Chan nguoi dung" : "Bo chan nguoi dung",
      next ? "Ban se khong the gui tin nhan cho nguoi nay." : "Bo chan nguoi nay?",
      [
        { text: "Huy", style: "cancel" },
        {
          onPress: () =>
            void runToggle(
              "block",
              { isBlocked: next },
              async () => {
                await setConversationBlocked(conversation.id, next);
                emitRealtimeConversationBlockedChanged({
                  conversationId: conversation.id,
                  isBlocked: next,
                });
              },
              { isBlocked: conversation.isBlocked },
              "Khong the cap nhat chan",
            ),
          style: next ? "destructive" : "default",
          text: next ? "Chan" : "Bo chan",
        },
      ],
    );
  }, [conversation, runToggle]);

  const openProfile = useCallback(() => {
    const userId = conversation?.otherParticipant?.id;
    if (!userId) return;
    router.push({ pathname: "/users/[userId]", params: { userId } });
  }, [conversation]);

  const openAttachments = useCallback(() => {
    router.push({
      pathname: "/chat/settings/[conversationId]-attachments",
      params: { conversationId },
    });
  }, [conversationId]);

  const openLinks = useCallback(() => {
    router.push({
      pathname: "/chat/settings/[conversationId]-links",
      params: { conversationId },
    });
  }, [conversationId]);

  const openSearch = useCallback(() => {
    router.push({
      pathname: "/chat/settings/[conversationId]-search",
      params: { conversationId },
    });
  }, [conversationId]);

  const missing = (name: string) => Alert.alert(name, "Chua co man hinh/API tu backend.");

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(spacing.xl, insets.top + spacing.md) }]}>
        <Pressable accessibilityLabel="Quay lai" hitSlop={10} onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>Cai dat cuoc tro chuyen</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryButton}>
            <Text style={styles.retryText}>Thu lai</Text>
          </Pressable>
        </View>
      ) : conversation ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.xl) }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void load("refresh")} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.info}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons color={colors.primary} name={isPrivate ? "person" : "people"} size={34} />
              </View>
            )}
            <View style={styles.infoText}>
              <View style={styles.nameLine}>
                <Text numberOfLines={1} style={styles.name}>{title}</Text>
                {isPrivate && conversation.otherParticipant?.isVerified ? (
                  <Ionicons color={colors.primary} name="checkmark-circle" size={18} />
                ) : null}
              </View>
              <Text style={styles.infoSubtitle}>
                {isPrivate ? (conversation.isBlocked ? "Da chan" : "Cuoc tro chuyen rieng") : `${conversation.memberCount ?? 0} thanh vien`}
              </Text>
            </View>
          </View>

          <Section title="Thong tin">
            {isPrivate ? (
              <SettingRow icon="person-circle-outline" onPress={openProfile} title="Xem ho so" />
            ) : (
              <>
                <SettingRow icon="people-outline" onPress={() => missing("Xem thanh vien")} title="Xem thanh vien" />
                <SettingRow icon="person-add-outline" onPress={() => missing("Them thanh vien")} title="Them thanh vien" />
              </>
            )}
          </Section>

          <Section title="Tuy chon">
            <SettingRow
              icon={conversation.isPinned ? "bookmark" : "bookmark-outline"}
              isLoading={loading === "pin"}
              right={<Switch disabled={loading === "pin"} onValueChange={togglePin} value={conversation.isPinned} />}
              title="Ghim cuoc tro chuyen"
            />
            <SettingRow
              icon={conversation.isMuted ? "notifications-off" : "notifications-outline"}
              isLoading={loading === "mute"}
              right={<Switch disabled={loading === "mute"} onValueChange={toggleMute} value={conversation.isMuted} />}
              title="Tat thong bao"
            />
            <SettingRow icon="search-outline" onPress={openSearch} title="Tim kiem trong cuoc tro chuyen" />
          </Section>

          <Section title="Noi dung da chia se">
            <SettingRow icon="images-outline" onPress={openAttachments} title="Anh, video va file" />
            <SettingRow icon="folder-open-outline" onPress={openAttachments} title="File da chia se" />
            <SettingRow icon="link-outline" onPress={openLinks} title="Lien ket da chia se" />
          </Section>

          {!isPrivate ? (
            <Section title="Quan ly nhom">
              <SettingRow icon="create-outline" onPress={() => missing("Doi ten nhom")} title="Doi ten nhom" />
              <SettingRow icon="camera-outline" onPress={() => missing("Doi anh nhom")} title="Doi anh nhom" />
              <SettingRow icon="options-outline" onPress={() => missing("Quan ly quyen gui tin nhan")} title="Quan ly quyen gui tin nhan" />
            </Section>
          ) : (
            <Section title="Bao mat">
              <SettingRow
                danger={conversation.isBlocked}
                icon={conversation.isBlocked ? "checkmark-circle-outline" : "ban-outline"}
                isLoading={loading === "block"}
                onPress={toggleBlock}
                title={conversation.isBlocked ? "Bo chan nguoi dung" : "Chan nguoi dung"}
              />
              <SettingRow danger icon="flag-outline" onPress={() => missing("Bao cao nguoi dung")} title="Bao cao nguoi dung" />
            </Section>
          )}

          <Section title="Nguy hiem">
            <SettingRow danger icon="trash-outline" onPress={() => missing("Xoa lich su tro chuyen")} title="Xoa lich su tro chuyen" />
            {!isPrivate ? <SettingRow danger icon="log-out-outline" onPress={() => missing("Roi nhom")} title="Roi nhom" /> : null}
          </Section>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 40, height: 80, width: 80 },
  avatarFallback: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 40, height: 80, justifyContent: "center", width: 80 },
  center: { alignItems: "center", flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl },
  content: { gap: spacing.lg, padding: spacing.md },
  dangerIcon: { backgroundColor: "rgba(239, 71, 111, 0.12)" },
  dangerText: { color: colors.danger },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  header: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  headerTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: "900", textAlign: "center" },
  iconButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  info: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  infoSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  infoText: { flex: 1 },
  name: { color: colors.text, flexShrink: 1, fontSize: 20, fontWeight: "900" },
  nameLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  retryButton: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 58, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rowDescription: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 10, height: 38, justifyContent: "center", width: 38 },
  rowPressed: { backgroundColor: colors.background },
  rowText: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  screen: { backgroundColor: colors.background, flex: 1 },
  section: { gap: spacing.sm },
  sectionBody: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "900", letterSpacing: 0, paddingHorizontal: spacing.xs, textTransform: "uppercase" },
});
