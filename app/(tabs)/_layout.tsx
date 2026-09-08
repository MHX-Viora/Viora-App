import { Tabs } from "expo-router";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { useEffect, useMemo, useState } from "react";

import { DesktopHeader } from "@/components/layout/desktop-header";
import { TabIcon } from "@/components/layout/tab-icon";
import { createFloatingTabBarStyle } from "@/components/layout/tab-bar-style";
import { useResponsive } from "@/hooks/use-responsive";
import { layout, useTheme } from "@/theme";
import {
  getChatUnreadCount,
  subscribeChatUnreadCount,
} from "@/utils/chat-unread-count";
import {
  getNotificationUnreadCount,
  subscribeNotificationUnreadCount,
} from "@/utils/notification-unread-count";

const getBadge = (count: number) =>
  count > 0 ? (count > 99 ? "99+" : count) : undefined;

export default function TabLayout() {
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const floatingTabBarStyle = useMemo(
    () => createFloatingTabBarStyle(theme),
    [theme],
  );
  const tabBadgeStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.danger,
      color: theme.colors.white,
      fontSize: 10,
      fontWeight: "800" as const,
      minWidth: 18,
    }),
    [theme],
  );
  const [unreadNotificationCount, setUnreadNotificationCountState] = useState(
    getNotificationUnreadCount(),
  );
  const [unreadChatCount, setUnreadChatCountState] =
    useState(getChatUnreadCount());

  useEffect(
    () => subscribeNotificationUnreadCount(setUnreadNotificationCountState),
    [],
  );

  useEffect(() => subscribeChatUnreadCount(setUnreadChatCountState), []);

  return (
    <Tabs
      tabBar={(props) =>
        isDesktopWeb ? (
          <DesktopHeader
            activeRoute={props.state.routes[props.state.index]?.name ?? "index"}
            chatBadge={getBadge(unreadChatCount)}
            notificationBadge={getBadge(unreadNotificationCount)}
          />
        ) : (
          <BottomTabBar {...props} />
        )
      }
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: theme.colors.background,
          paddingTop: isDesktopWeb ? layout.desktopHeaderHeight : 0,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelPosition: "below-icon",
        tabBarItemStyle: {
          borderRadius: 16,
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 1,
        },
        tabBarStyle: floatingTabBarStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: "Trang chủ",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "home" : "home-outline"}
            />
          ),
          title: "Trang chủ",
        }}
      />
      <Tabs.Screen
        name="utilities"
        options={{
          tabBarAccessibilityLabel: "Tiện ích",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "grid" : "grid-outline"}
            />
          ),
          title: "Tiện ích",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarAccessibilityLabel: "Trò chuyện",
          tabBarBadge: getBadge(unreadChatCount),
          tabBarBadgeStyle: tabBadgeStyle,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "chatbubble" : "chatbubble-outline"}
            />
          ),
          title: "Trò chuyện",
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          href: null,
          title: "Reels",
        }}
      />
      <Tabs.Screen
        name="notification"
        options={{
          tabBarAccessibilityLabel: "Thông báo",
          tabBarBadge: getBadge(unreadNotificationCount),
          tabBarBadgeStyle: tabBadgeStyle,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "notifications" : "notifications-outline"}
            />
          ),
          title: "Thông báo",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarAccessibilityLabel: "Hồ sơ",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "person" : "person-outline"}
            />
          ),
          title: "Hồ sơ",
        }}
      />
    </Tabs>
  );
}
