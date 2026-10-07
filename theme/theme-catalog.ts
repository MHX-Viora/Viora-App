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
    description: "Dark Navy và Cyan ANKT",
    id: "modern",
    name: "Modern Dark",
    theme: modernTheme,
  },
  "premium-ocean": {
    description: "Dark Navy, Ocean Cyan và chiều sâu tinh tế",
    id: "premium-ocean",
    name: "Ocean",
    theme: premiumOceanTheme,
  },
  classic: {
    description: "Nền dịu, bề mặt phân tầng và teal ANKT",
    id: "classic",
    name: "Light",
    theme: classicTheme,
  },
};

export const themeCatalog: readonly ThemeDefinition[] = [
  definitions.classic,
  definitions.modern,
  definitions["premium-ocean"],
];

export const getThemeDefinition = (mode: ThemeMode): ThemeDefinition =>
  definitions[mode];
