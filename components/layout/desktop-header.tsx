import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import {
  desktopNavigationItems,
  getActiveDesktopRoute,
  type DesktopRoute,
} from "@/components/layout/desktop-navigation";
import { UserAvatar } from "@/components/common/user-avatar";
import { getSession, subscribeSession } from "@/stores/session-store";
import { breakpoints, layout, spacing, type AppTheme, useTheme } from "@/theme";
import type { User } from "@/types/auth";
import {
  getChatUnreadCount,
  subscribeChatUnreadCount,
} from "@/utils/chat-unread-count";
import {
  getNotificationUnreadCount,
  subscribeNotificationUnreadCount,
} from "@/utils/notification-unread-count";

type DesktopHeaderProps = {
  activeRoute: string;
  chatBadge?: number | string;
  notificationBadge?: number | string;
};

function HeaderTab({
  active,
  badge,
  item,
}: {
  active: boolean;
  badge?: number | string;
  item: (typeof desktopNavigationItems)[number];
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityLabel={item.title}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => router.push(item.href)}
      style={({ pressed }) => [
        styles.tab,
        (hovered || pressed) && styles.tabHovered,
      ]}
    >
      <View style={styles.tabIconWrap}>
        <Ionicons
          color={active ? theme.colors.primary : theme.colors.textMuted}
          name={active ? item.iconActive : item.icon}
          size={23}
        />
        {badge !== undefined ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {item.title}
      </Text>
      {active ? <View style={styles.activeIndicator} /> : null}
    </Pressable>
  );
}

export function DesktopHeader({
  activeRoute,
  chatBadge,
  notificationBadge,
}: DesktopHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [user, setUser] = useState<User | null>(null);
  const [liveChatBadge, setLiveChatBadge] = useState(getChatUnreadCount());
  const [liveNotificationBadge, setLiveNotificationBadge] = useState(
    getNotificationUnreadCount(),
  );
  const active = getActiveDesktopRoute(activeRoute);

  useEffect(() => {
    void getSession().then((session) => setUser(session?.user ?? null));
    return subscribeSession((session) => setUser(session?.user ?? null));
  }, []);

  useEffect(() => subscribeChatUnreadCount(setLiveChatBadge), []);
  useEffect(
    () => subscribeNotificationUnreadCount(setLiveNotificationBadge),
    [],
  );

  const fallbackBadge = (count: number) =>
    count > 0 ? (count > 99 ? "99+" : count) : undefined;

  const badgeFor = (route: DesktopRoute) => {
    if (route === "chat") return chatBadge ?? fallbackBadge(liveChatBadge);
    if (route === "notification") {
      return notificationBadge ?? fallbackBadge(liveNotificationBadge);
    }
    return undefined;
  };

  return (
    <View accessibilityRole="header" style={styles.header}>
      <View style={styles.inner}>
        <Pressable
          accessibilityLabel="ANKT - Trang chủ"
          accessibilityRole="link"
          onPress={() => router.push("/")}
          style={({ pressed }) => [styles.brand, pressed && styles.brandPressed]}
        >
          <View style={styles.logo}>
            <Image
              accessibilityIgnoresInvertColors
              source={require("../../assets/images/viora_logo.png")}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.brandText}>ANKT</Text>
        </Pressable>

        <View accessibilityRole="tablist" style={styles.navigation}>
          {desktopNavigationItems.map((item) => (
            <HeaderTab
              active={active === item.route}
              badge={badgeFor(item.route)}
              item={item}
              key={item.route}
            />
          ))}
        </View>

        <View style={styles.rightActions}>
          <Pressable
            accessibilityLabel="Mở hồ sơ"
            accessibilityRole="button"
            onPress={() => router.push("/profile")}
            style={({ pressed }) => [styles.user, pressed && styles.brandPressed]}
          >
            <UserAvatar
              displayName={user?.displayName}
              imageUrl={user?.avatarUrl}
              size={36}
              style={styles.avatar}
            />
            <Text numberOfLines={1} style={styles.userName}>
              {user?.displayName || "Hồ sơ"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    activeIndicator: {
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
      bottom: 0,
      height: 3,
      left: spacing.md,
      position: "absolute",
      right: spacing.md,
    },
    avatar: { borderRadius: 18, height: 36, width: 36 },
    avatarFallback: {
      alignItems: "center",
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.border,
      borderRadius: 18,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    badge: {
      alignItems: "center",
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.surface,
      borderRadius: 9,
      borderWidth: 2,
      justifyContent: "center",
      minHeight: 18,
      minWidth: 18,
      paddingHorizontal: 3,
      position: "absolute",
      right: -10,
      top: -8,
    },
    badgeText: { color: theme.colors.white, fontSize: 9, fontWeight: "900" },
    brand: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      minWidth: 150,
    },
    brandPressed: { opacity: 0.72 },
    brandText: {
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    header: {
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.borderSubtle,
      borderBottomWidth: 1,
      height: layout.desktopHeaderHeight,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
      zIndex: 100,
    },
    inner: {
      alignItems: "center",
      alignSelf: "center",
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      maxWidth: breakpoints.largeDesktop,
      paddingHorizontal: layout.pageGutter,
      width: "100%",
    },
    logo: {
      borderRadius: 17,
      height: 34,
      overflow: "hidden",
      width: 34,
    },
    logoImage: {
      height: 38,
      left: -2,
      position: "absolute",
      top: -2,
      width: 38,
    },
    navigation: {
      alignItems: "stretch",
      alignSelf: "stretch",
      flexDirection: "row",
      justifyContent: "center",
    },
    rightActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "flex-end",
      minWidth: 292,
    },
    tab: {
      alignItems: "center",
      borderRadius: 10,
      gap: 2,
      justifyContent: "center",
      minWidth: 92,
      paddingHorizontal: spacing.md,
      position: "relative",
    },
    tabHovered: { backgroundColor: theme.colors.primarySoft },
    tabIconWrap: { position: "relative" },
    tabLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" },
    tabLabelActive: { color: theme.colors.primary },
    user: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "flex-end",
      minWidth: 132,
    },
    userName: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: "700",
      maxWidth: 100,
    },
  });
