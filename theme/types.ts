import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

import type { ThemeMode } from "./theme-mode";
import type { ThemeVisuals } from "./visuals";

export type ThemeColors = {
  avatarBorder: string;
  background: string;
  badge: string;
  black: string;
  border: string;
  borderRead: string;
  borderSubtle: string;
  card: string;
  danger: string;
  dangerSoft: string;
  divider: string;
  glow: string;
  icon: string;
  input: string;
  messageMine: string;
  messageOther: string;
  overlay: string;
  placeholder: string;
  primary: string;
  primaryContrast: string;
  primaryPressed: string;
  primarySoft: string;
  qrBackground: string;
  qrForeground: string;
  reaction: string;
  reelBackground: string;
  secondaryBackground: string;
  shadow: string;
  success: string;
  successSoft: string;
  successText: string;
  surface: string;
  surfaceElevated: string;
  tabBar: string;
  tabBarBorder: string;
  text: string;
  textMuted: string;
  toastBackground: string;
  toastText: string;
  verified: string;
  visuals: ThemeVisuals;
  white: string;
};

export type ThemeEffects = {
  blurEnabled: boolean;
  cardRadius: number;
  glassEnabled: boolean;
  glowEnabled: boolean;
  gradientEnabled: boolean;
  shadow: Pick<
    ViewStyle,
    "elevation" | "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius"
  >;
};

export type AppTheme = {
  colors: ThemeColors;
  effects: ThemeEffects;
  isDark: boolean;
  mode: ThemeMode;
  notifications: ThemeColors;
  reels: ThemeColors;
};

export type ThemedStyle<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};
