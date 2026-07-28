import type { AppTheme } from "@/theme";

export const TAB_BAR_BOTTOM = 18;
export const TAB_BAR_HEIGHT = 78;

export const createFloatingTabBarStyle = (theme: AppTheme) => ({
  backgroundColor: theme.colors.tabBar,
  borderColor: theme.colors.tabBarBorder,
  borderRadius: theme.isDark ? 20 : theme.effects.cardRadius,
  borderWidth: 1,
  bottom: TAB_BAR_BOTTOM,
  elevation: 16,
  height: TAB_BAR_HEIGHT,
  left: 14,
  paddingBottom: 8,
  paddingTop: 8,
  position: "absolute" as const,
  right: 14,
  shadowColor: theme.colors.primary,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.16,
  shadowRadius: 14,
  ...(theme.isDark ? null : theme.effects.shadow),
});
