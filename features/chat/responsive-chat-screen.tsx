import Ionicons from "@expo/vector-icons/Ionicons";
import { type ReactNode, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DesktopHeader } from "@/components/layout/desktop-header";
import { ChatScreen } from "@/features/chat/chat-screen";
import { ConversationSettingsScreen } from "@/features/chat/conversation-settings-screen";
import { ConversationsScreen } from "@/features/chat/conversations-screen";
import {
  getResponsiveChatMode,
  getResponsiveConversationSettingsMode,
} from "@/features/chat/responsive-chat-layout";
import { useResponsive } from "@/hooks/use-responsive";
import { layout, spacing, type ThemeColors, useTheme } from "@/theme";

function DesktopChatShell({
  children,
  includeDesktopHeader,
}: {
  children: ReactNode;
  includeDesktopHeader: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <View style={styles.screen}>
      {includeDesktopHeader ? <DesktopHeader activeRoute="chat" /> : null}
      <View
        style={[
          styles.split,
          includeDesktopHeader && { paddingTop: layout.desktopHeaderHeight },
        ]}
      >
        <View style={styles.sidebar}>
          <ConversationsScreen autoOpenRequestedConversation={false} />
        </View>
        <View style={styles.detail}>{children}</View>
      </View>
    </View>
  );
}

export function ResponsiveChatScreen({
  hasConversation,
  includeDesktopHeader = false,
}: {
  hasConversation: boolean;
  includeDesktopHeader?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const { isDesktopWeb } = useResponsive();
  const mode = getResponsiveChatMode({ hasConversation, isDesktopWeb });

  if (mode === "list") return <ConversationsScreen />;
  if (mode === "detail") return <ChatScreen />;

  return (
    <DesktopChatShell includeDesktopHeader={includeDesktopHeader}>
      {mode === "split-detail" ? (
        <ChatScreen />
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons
              color={theme.colors.primary}
              name="chatbubbles-outline"
              size={42}
            />
          </View>
          <Text style={styles.emptyTitle}>Tin nhắn của bạn</Text>
          <Text style={styles.emptyText}>
            Chọn một cuộc trò chuyện để bắt đầu nhắn tin.
          </Text>
        </View>
      )}
    </DesktopChatShell>
  );
}

export function ResponsiveConversationSettingsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const { isDesktopWeb, isLargeDesktop } = useResponsive();
  const mode = getResponsiveConversationSettingsMode({
    isDesktopWeb,
    isLargeDesktop,
  });

  if (mode === "settings") return <ConversationSettingsScreen />;

  return (
    <DesktopChatShell includeDesktopHeader>
      {mode === "room-settings" ? (
        <View style={styles.settingsLayout}>
          <View style={styles.roomPane}>
            <ChatScreen />
          </View>
          <View style={styles.settingsPane}>
            <ConversationSettingsScreen />
          </View>
        </View>
      ) : (
        <ConversationSettingsScreen />
      )}
    </DesktopChatShell>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    detail: { flex: 1, minWidth: 0 },
    empty: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      padding: spacing.xl,
    },
    emptyIcon: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: 36,
      height: 72,
      justifyContent: "center",
      marginBottom: spacing.md,
      width: 72,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      marginTop: spacing.xs,
      textAlign: "center",
    },
    emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
    screen: { backgroundColor: colors.background, flex: 1 },
    roomPane: { flex: 1, minWidth: 0 },
    settingsLayout: { flex: 1, flexDirection: "row", minWidth: 0 },
    settingsPane: {
      borderLeftColor: colors.border,
      borderLeftWidth: 1,
      flexBasis: layout.chatSettingsPanelWidth,
      flexGrow: 0,
      flexShrink: 0,
      minWidth: 0,
    },
    sidebar: {
      borderRightColor: colors.border,
      borderRightWidth: 1,
      flexBasis: layout.chatSidebarWidth,
      flexGrow: 0,
      flexShrink: 0,
      minWidth: 0,
    },
    split: {
      flex: 1,
      flexDirection: "row",
      minHeight: 0,
      width: "100%",
    },
  });
