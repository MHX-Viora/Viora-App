import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


type ChatComposerNoticeProps = {
  message: string;
  type: "blocked" | "permission";
};

export function ChatComposerNotice({ message, type }: ChatComposerNoticeProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (type === "blocked") {
    return (
      <View style={styles.blockedComposer}>
        <Ionicons color={colors.danger} name="ban-outline" size={18} />
        <Text style={styles.blockedComposerText}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.permissionComposer}>
      <Text style={styles.permissionComposerText}>{message}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  blockedComposer: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_239_71_111_0_1,
    borderColor: colors.visuals.rgb_239_71_111_0_35,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  blockedComposerText: {
    color: colors.danger,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  permissionComposer: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_239_71_111_0_1,
    borderColor: colors.visuals.rgb_239_71_111_0_35,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  permissionComposerText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
