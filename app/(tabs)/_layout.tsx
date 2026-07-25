import { Tabs } from "expo-router";
import { useEffect, useState } from "react";

import { TabIcon } from "@/components/layout/tab-icon";
import { floatingTabBarStyle } from "@/components/layout/tab-bar-style";
import { communityColors as navigationColors } from "@/features/feed/community-colors";
import { colors } from "@/theme";
import {
  getChatUnreadCount,
  subscribeChatUnreadCount,
} from "@/utils/chat-unread-count";
import {
  getNotificationUnreadCount,
  subscribeNotificationUnreadCount,
} from "@/utils/notification-unread-count";

const tabBadgeStyle = {
  backgroundColor: colors.danger,
  color: colors.white,
  fontSize: 10,
  fontWeight: "800" as const,
  minWidth: 18,
};

const getBadge = (count: number) =>
  count > 0 ? (count > 99 ? "99+" : count) : undefined;

export default function TabLayout() {
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: navigationColors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: navigationColors.textMuted,
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
        name="reels"
        options={{
          tabBarAccessibilityLabel: "Reels",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "play-circle" : "play-circle-outline"}
            />
          ),
          title: "Reels",
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
        name="utilities"
        options={{
          href: null,
          title: "Tiện ích",
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
