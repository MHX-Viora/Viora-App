import { type PropsWithChildren, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getFixedTopBarBackgroundLayout,
  getFixedTopBarLayout,
} from "@/components/layout/responsive-layout";
import { useResponsive } from "@/hooks/use-responsive";
import { type AppTheme, useTheme } from "@/theme";

export function FixedTopBar({
  children,
  isArticle = false,
}: PropsWithChildren<{ isArticle?: boolean }>) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktopWeb, isWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const barLayout = getFixedTopBarLayout({
    isArticle,
    isCompactWeb: isWeb && !isDesktopWeb,
    isDesktopWeb,
  });
  const backgroundLayout = getFixedTopBarBackgroundLayout({
    barHeight: barLayout.height,
    isWeb,
    topInset: insets.top,
  });

  return (
    <View style={[styles.container, barLayout, backgroundLayout]}>{children}</View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    justifyContent: "flex-end",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
});
