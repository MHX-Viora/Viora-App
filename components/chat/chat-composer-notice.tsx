import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

type ChatComposerNoticeProps = {
  message: string;
  type: "blocked" | "permission";
};

export function ChatComposerNotice({ message, type }: ChatComposerNoticeProps) {
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

const styles = StyleSheet.create({
  blockedComposer: {
    alignItems: "center",
    backgroundColor: "rgba(239, 71, 111, 0.1)",
    borderColor: "rgba(239, 71, 111, 0.35)",
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
    backgroundColor: "rgba(239, 71, 111, 0.1)",
    borderColor: "rgba(239, 71, 111, 0.35)",
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
