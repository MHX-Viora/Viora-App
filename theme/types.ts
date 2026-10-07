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
  dangerContrast: string;
  dangerSoft: string;
  divider: string;
  glow: string;
  icon: string;
  input: string;
  messageMine: string;
  messageMineMuted: string;
  messageMineText: string;
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
  successContrast: string;
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
  verifiedContrast: string;
  visuals: ThemeVisuals;
  warning: string;
  warningSoft: string;
  white: string;
};

export type ThemeGradient = readonly [string, string, ...string[]];

export type ThemeGradients = {
  messageMine: ThemeGradient;
  premiumBadge: ThemeGradient;
  primary: ThemeGradient;
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

export type WalletTheme = {
  accent: string;
  accentContrast: string;
  bannerAccent: string;
  bannerBackground: string;
  bannerBorder: string;
  cardBackground: string;
  cardBorder: string;
  coinBackground: string;
  coinBorder: string;
  coinText: string;
  glow: string;
  historyBackground: string;
  iconBackground: string;
  miniAccent: string;
  miniBackground: string;
  miniBorder: string;
  miniSoft: string;
  moreAccent: string;
  moreBackground: string;
  moreBorder: string;
  moreSoft: string;
  muted: string;
  skeleton: string;
  text: string;
  walletBack: string;
  walletBody: string;
};

export type AppTheme = {
  colors: ThemeColors;
  effects: ThemeEffects;
  gradients: ThemeGradients;
  isDark: boolean;
  mode: ThemeMode;
  notifications: ThemeColors;
  reels: ThemeColors;
  wallet: WalletTheme;
};

export type ThemedStyle<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};
