import { type PropsWithChildren, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { type AppTheme, useTheme } from "@/theme";

export const FIXED_TOP_BAR_HEIGHT = 100;

export function FixedTopBar({ children }: PropsWithChildren) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.container}>{children}</View>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    height: FIXED_TOP_BAR_HEIGHT,
    justifyContent: "flex-end",
    left: 0,
    paddingTop: 60,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
});
