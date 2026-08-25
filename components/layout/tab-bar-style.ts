import type { AppTheme } from "@/theme";

export const TAB_BAR_BOTTOM = 0;
export const TAB_BAR_HEIGHT = 80;

export const createFloatingTabBarStyle = (theme: AppTheme) => ({
  backgroundColor: theme.colors.tabBar,
  borderColor: theme.colors.tabBarBorder,
  borderRadius: theme.isDark ? 20 : theme.effects.cardRadius,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  borderWidth: 1,
  bottom: TAB_BAR_BOTTOM,
  elevation: 16,
  height: TAB_BAR_HEIGHT,
  left: 0,
  paddingBottom: 12,
  paddingTop: 4,
  position: "absolute" as const,
  right: 0,
  shadowColor: theme.colors.primary,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.16,
  shadowRadius: 14,
  ...(theme.isDark ? null : theme.effects.shadow),
});
