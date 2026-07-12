import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { friends } from "@/features/profile/friends-data";
import type { Friend } from "@/features/profile/friends-data";
import { colors, spacing } from "@/theme";

export function FriendsScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại hồ sơ"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.text} name="chevron-back" size={26} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Bạn bè
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={friends}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(friend) => friend.id}
        ListHeaderComponent={
          <Text style={styles.count}>{friends.length} người bạn</Text>
        }
        renderItem={({ item }) => <FriendRow friend={item} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  return (
    <View accessibilityLabel={`${friend.name}, ${friend.handle}`} style={styles.friendRow}>
      <Image
        accessibilityLabel={`Ảnh đại diện của ${friend.name}`}
        contentFit="cover"
        source={friend.avatar}
        style={styles.avatar}
      />
      <View style={styles.friendInfo}>
        <Text numberOfLines={1} style={styles.friendName}>
          {friend.name}
        </Text>
        <Text numberOfLines={1} style={styles.handle}>
          {friend.handle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 28, height: 56, width: 56 },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  friendInfo: { flex: 1 },
  friendName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  friendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 76,
  },
  handle: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  headerSpacer: { width: 40 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  pressed: { opacity: 0.6 },
  screen: { backgroundColor: colors.surface, flex: 1 },
  separator: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 72 },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
});
