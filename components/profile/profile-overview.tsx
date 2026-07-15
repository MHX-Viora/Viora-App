import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ViewableImage } from "@/components/common/viewable-image";
import { colors, spacing } from "@/theme";

export function ProfileOverview({
  avatar,
  cover,
  handle,
  name,
  onEdit,
}: {
  avatar: string;
  cover: string;
  handle: string;
  name: string;
  onEdit?: () => void;
}) {
  return (
    <>
      <View style={styles.hero}>
        <ViewableImage
          accessibilityLabel={`Ảnh bìa của ${name}`}
          contentFit="cover"
          source={cover}
          style={styles.cover}
        />
        <ViewableImage
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
            onPress={onEdit}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.editButtonPressed,
            ]}
          >
            <Ionicons color={colors.white} name="pencil" size={14} />
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
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  editButtonPressed: { opacity: 0.82, transform: [{ scale: 0.95 }] },
  handle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  hero: { marginBottom: 38, position: "relative" },
  identity: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  name: { color: colors.text, flexShrink: 1, fontSize: 24, fontWeight: "800" },
  nameRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: "100%",
  },
});
