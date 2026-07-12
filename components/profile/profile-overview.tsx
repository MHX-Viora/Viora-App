import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

export function ProfileOverview({
  avatar,
  cover,
  handle,
  name,
}: {
  avatar: string;
  cover: string;
  handle: string;
  name: string;
}) {
  return (
    <>
      <View style={styles.hero}>
        <Image
          accessibilityLabel={`Ảnh bìa của ${name}`}
          contentFit="cover"
          source={cover}
          style={styles.cover}
        />
        <Image
          accessibilityLabel={`Ảnh đại diện của ${name}`}
          contentFit="cover"
          source={avatar}
          style={styles.avatar}
        />
      </View>
      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Pressable
            accessibilityLabel="Chỉnh sửa hồ sơ"
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.editButtonPressed,
            ]}
          >
            <Ionicons color={colors.white} name="pencil" size={18} />
          </Pressable>
        </View>
        <Text style={styles.handle}>{handle}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderColor: colors.surface,
    borderRadius: 43,
    borderWidth: 4,
    bottom: -38,
    height: 86,
    left: spacing.md,
    position: "absolute",
    width: 86,
  },
  cover: { height: 170, width: "100%" },
  editButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  editButtonPressed: { opacity: 0.82, transform: [{ scale: 0.95 }] },
  handle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  hero: { marginBottom: 38, position: "relative" },
  identity: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  name: { color: colors.text, flexShrink: 1, fontSize: 24, fontWeight: "800" },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
