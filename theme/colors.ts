import { modernTheme } from "./modern";

/**
 * Legacy Modern palette. New UI must use `useTheme()` so it can react to mode
 * changes; this export remains while existing components are migrated.
 */
export const colors = {
  ...modernTheme.colors,
  reelOverlay: modernTheme.colors.overlay,
} as const;
