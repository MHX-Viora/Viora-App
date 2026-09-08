export const THEME_STORAGE_KEY = "theme_mode";
export const DEFAULT_THEME_MODE = "modern" as const;

export const THEME_MODES = ["modern", "premium-ocean", "classic"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export function normalizeThemeMode(value: string | null): ThemeMode {
  return THEME_MODES.includes(value as ThemeMode)
    ? (value as ThemeMode)
    : DEFAULT_THEME_MODE;
}
