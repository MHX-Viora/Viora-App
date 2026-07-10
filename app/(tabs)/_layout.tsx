import { Tabs } from "expo-router";

import { TabIcon } from "@/components/layout/tab-icon";
import { colors } from "@/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600", marginTop: 2 },
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
