import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ViewableImage } from "@/components/common/viewable-image";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function ProfileOverview({
  actionSlot,
  avatar,
  bio,
  cover,
  handle,
  isVerified,
  name,
  onEdit,
  showEditButton = false,
}: {
  actionSlot?: ReactNode;
  avatar: string;
  bio?: string;
  cover: string;
  handle: string;
  isVerified?: boolean;
  name: string;
  onEdit?: () => void;
  showEditButton?: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <>
      <View style={styles.hero}>
        <ViewableImage
          accessibilityLabel={`Anh bia cua ${name}`}
          contentFit="cover"
          source={cover}
          style={styles.cover}
        />
        <ViewableImage
          accessibilityLabel={`Anh dai dien cua ${name}`}
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
          {isVerified && (
            <Ionicons
              accessibilityLabel="Tai khoan da xac minh"
              color={colors.verified}
              name="checkmark-circle"
              size={20}
            />
          )}
          {showEditButton && onEdit && (
            <Pressable
              accessibilityLabel="Chinh sua ho so"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onEdit}
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.editButtonPressed,
              ]}
            >
              <Ionicons color={colors.primaryContrast} name="pencil" size={14} />
            </Pressable>
          )}
        </View>
        <Text style={styles.handle}>{handle}</Text>
        {!!bio?.trim() && <Text style={styles.bio}>{bio.trim()}</Text>}
        {actionSlot}
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: {
    borderColor: colors.primary,
    borderRadius: 43,
    borderWidth: 3,
    bottom: -38,
    height: 86,
    left: spacing.md,
    position: "absolute",
    width: 86,
  },
  bio: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  cover: { borderRadius: 12, height: 170, width: "100%" },
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
  hero: {
    marginBottom: 38,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    position: "relative",
  },
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
