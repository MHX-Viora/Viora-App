import { type PropsWithChildren, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { getFixedTopBarLayout } from "@/components/layout/responsive-layout";
import { useResponsive } from "@/hooks/use-responsive";
import { type AppTheme, useTheme } from "@/theme";

export function FixedTopBar({ children }: PropsWithChildren) {
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const barLayout = getFixedTopBarLayout({ isDesktopWeb });

  return <View style={[styles.container, barLayout]}>{children}</View>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    justifyContent: "flex-end",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
});
