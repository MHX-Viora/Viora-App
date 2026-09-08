import { classicTheme } from "./classic";
import { modernTheme } from "./modern";
import { premiumOceanTheme } from "./premium-ocean";
import type { ThemeMode } from "./theme-mode";
import type { AppTheme } from "./types";

export type ThemeDefinition = {
  description: string;
  id: ThemeMode;
  name: string;
  theme: AppTheme;
};

const definitions: Record<ThemeMode, ThemeDefinition> = {
  modern: {
    description: "Giao diện ANKT hiện tại",
    id: "modern",
    name: "Mặc định",
    theme: modernTheme,
  },
  "premium-ocean": {
    description: "Dark Navy, Ocean Cyan và chiều sâu tinh tế",
    id: "premium-ocean",
    name: "Ocean",
    theme: premiumOceanTheme,
  },
  classic: {
    description: "Nền sáng, xanh dương và thiết kế phẳng",
    id: "classic",
    name: "Cổ điển",
    theme: classicTheme,
  },
};

export const themeCatalog: readonly ThemeDefinition[] = [
  definitions.modern,
  definitions["premium-ocean"],
  definitions.classic,
];

export const getThemeDefinition = (mode: ThemeMode): ThemeDefinition =>
  definitions[mode];
