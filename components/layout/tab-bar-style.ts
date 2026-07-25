import { communityColors as colors } from "@/features/feed/community-colors";

export const TAB_BAR_BOTTOM = 18;
export const TAB_BAR_HEIGHT = 78;

export const floatingTabBarStyle = {
  backgroundColor: "rgba(21, 31, 51, 0.88)",
  borderColor: "rgba(170, 194, 222, 0.30)",
  borderRadius: 20,
  borderWidth: 1,
  bottom: TAB_BAR_BOTTOM,
  elevation: 16,
  height: TAB_BAR_HEIGHT,
  left: 14,
  paddingBottom: 8,
  paddingTop: 8,
  position: "absolute" as const,
  right: 14,
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.16,
  shadowRadius: 14,
};
