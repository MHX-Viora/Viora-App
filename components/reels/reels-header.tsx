import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

const REELS_HEADER_HEIGHT = 90;
const REELS_HEADER_PADDING_TOP = 50;

export function ReelsHeader({ onCreatePress, onSearchPress }: { onCreatePress: () => void; onSearchPress: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          accessibilityHint="Mở màn hình tạo bài đăng video mới"
          accessibilityLabel="Tạo bài đăng video mới"
          accessibilityRole="button"
          onPress={onCreatePress}
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.createButtonPressed,
          ]}
        >
          <Ionicons color={colors.white} name="add" size={22} />
        </Pressable>
        <Text style={styles.inactive}>Bạn bè</Text>
        <Text style={styles.inactive}>Theo dõi</Text>
        <View style={styles.activeWrap}>
          <Text style={styles.active}>Đề xuất</Text>
          <View style={styles.underline} />
        </View>
        <Pressable
          accessibilityLabel="Tìm kiếm reels"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onSearchPress}
        >
          <Ionicons color={colors.white} name="search" size={24} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  active: { color: colors.white, fontSize: 14, fontWeight: "700" },
  activeWrap: { alignItems: "center", gap: 6 },
  container: {
    height: REELS_HEADER_HEIGHT,
    justifyContent: "flex-end",
    left: 0,
    paddingTop: REELS_HEADER_PADDING_TOP,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  createButton: {
    alignItems: "center",
    backgroundColor: "rgba(18,24,32,0.5)",
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 19,
    borderWidth: 1,
    height: 33,
    justifyContent: "center",
    marginTop: -7,
    width: 33,
  },
  createButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ scale: 0.94 }],
  },
  inactive: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    textAlign: "center",
    width: 58,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  underline: {
    backgroundColor: colors.white,
    borderRadius: 1,
    height: 2,
    width: 30,
  },
});
