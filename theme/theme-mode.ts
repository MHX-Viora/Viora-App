export const THEME_STORAGE_KEY = "theme_mode";
export const DEFAULT_THEME_MODE = "modern" as const;

export type ThemeMode = "modern" | "classic";

export function normalizeThemeMode(value: string | null): ThemeMode {
  return value === "classic" || value === "modern"
    ? value
    : DEFAULT_THEME_MODE;
}
