import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import { type ThemeColors, useTheme } from "@/theme";
import { ACCOUNT_STYLE_LABELS, AccountStyle } from "@/types/account-style";

export function AccountStyleBadge({ accountStyle }: { accountStyle?: AccountStyle | number }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  if (accountStyle === undefined || accountStyle === AccountStyle.Personal) return null;

  const label = ACCOUNT_STYLE_LABELS[accountStyle as AccountStyle];
  if (!label) return null;
  return <Text style={styles.badge}>{label}</Text>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
