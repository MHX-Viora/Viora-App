import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

type ProfileTab = "posts" | "videos";

export function ProfileContent({
  stats,
}: {
  stats: readonly { label: string; value: string }[];
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  return (
    <>
      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text numberOfLines={1} style={styles.statLabel}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.tabs}>
        <ProfileTabButton
          active={activeTab === "posts"}
          label="Bài viết"
          onPress={() => setActiveTab("posts")}
        />
        <ProfileTabButton
          active={activeTab === "videos"}
          label="Video"
          onPress={() => setActiveTab("videos")}
        />
      </View>
      <View style={styles.emptyState}>
        <Ionicons
          color={colors.textMuted}
          name={activeTab === "posts" ? "images-outline" : "videocam-outline"}
          size={32}
        />
        <Text style={styles.emptyText}>
          {activeTab === "posts"
            ? "Bài viết của bạn sẽ xuất hiện tại đây"
            : "Video của bạn sẽ xuất hiện tại đây"}
        </Text>
      </View>
    </>
  );
}

function ProfileTabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.tab}
    >
      <Text style={[styles.tabText, active && styles.activeTabText]}>
        {label}
      </Text>
      {active && <View style={styles.activeIndicator} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    backgroundColor: colors.primary,
    bottom: -1,
    height: 2,
    left: 0,
    position: "absolute",
    right: 0,
  },
  activeTabText: { color: colors.primary, fontWeight: "700" },
  emptyState: { alignItems: "center", gap: spacing.sm, paddingVertical: 48 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  statItem: { alignItems: "center", flex: 1 },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  stats: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginTop: 32,
    paddingVertical: spacing.lg,
  },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "800" },
  tab: {
    alignItems: "center",
    flex: 1,
    paddingVertical: spacing.md,
    position: "relative",
  },
  tabs: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },
});
