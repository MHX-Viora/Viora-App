import { Tabs, usePathname } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { TabIcon } from "@/components/layout/tab-icon";
import {
  getNotificationUnreadCount,
  setNotificationUnreadCount,
  subscribeNotificationUnreadCount,
} from "@/features/notifications/notification-unread-count";
import { getNotifications } from "@/services/notification.service";
import { colors } from "@/theme";

export default function TabLayout() {
  const pathname = usePathname();
  const [unreadNotificationCount, setUnreadNotificationCountState] = useState(
    getNotificationUnreadCount(),
  );

  const loadUnreadNotificationCount = useCallback(async () => {
    try {
      const result = await getNotifications({ page: 1, pageSize: 1 });
      setNotificationUnreadCount(result.unreadCount);
    } catch {
      setNotificationUnreadCount(0);
    }
  }, []);

  useEffect(
    () => subscribeNotificationUnreadCount(setUnreadNotificationCountState),
    [],
  );

  useEffect(() => {
    loadUnreadNotificationCount();
  }, [loadUnreadNotificationCount, pathname]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        tabBarStyle: {
          backgroundColor: "#F7F9FC",
          borderTopColor: colors.border,
          height: 100,
          paddingBottom: 20,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarAccessibilityLabel: "Trang chủ",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "home" : "home-outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: "Reels",
          tabBarAccessibilityLabel: "Reels",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "play-circle" : "play-circle-outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Trò chuyện",
          tabBarAccessibilityLabel: "Trò chuyện",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "chatbubble" : "chatbubble-outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="utilities"
        options={{
          title: "Tiện ích",
          tabBarAccessibilityLabel: "Tiện ích",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "grid" : "grid-outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notification"
        options={{
          title: "Thông báo",
          tabBarAccessibilityLabel: "Thông báo",
          tabBarBadge:
            unreadNotificationCount > 0
              ? unreadNotificationCount > 99
                ? "99+"
                : unreadNotificationCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: colors.white,
            fontSize: 10,
            fontWeight: "800",
            minWidth: 18,
          },
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "notifications" : "notifications-outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarAccessibilityLabel: "Hồ sơ",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "person" : "person-outline"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
