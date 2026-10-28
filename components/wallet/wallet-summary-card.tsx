import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from "react-native";

import { spacing, typography, type ThemeColors, useTheme } from "@/theme";
import type { Wallet } from "@/types/wallet";
import { formatVnd } from "@/utils/wallet-format";
import { formatAnktCoin } from "@/utils/money";

const walletBackground = require("../../assets/images/wallet-card-navy-gold.png");
export const WALLET_CARD_ASPECT_RATIO = 1853 / 849;
export const WALLET_CARD_MAX_WIDTH = 420;

type Props = {
  error?: string | null;
  loading?: boolean;
  onDeposit: () => void;
  onHistory: () => void;
  onRetry?: () => void;
  onWithdraw: () => void;
  wallet: Wallet | null;
};

export function WalletSummaryCard({ error, loading = false, onDeposit, onHistory, onRetry, onWithdraw, wallet }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [hidden, setHidden] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const contentWidth = cardWidth || Math.min(WALLET_CARD_MAX_WIDTH, Math.max(0, width - spacing.lg * 2));
  const styles = useMemo(() => createStyles({
    ...theme.colors,
    surface: "#071A2A",
    text: "#F4F8FC",
    textMuted: "#BDD0E0",
    borderSubtle: "rgba(233, 197, 116, 0.3)",
    secondaryBackground: "rgba(255, 255, 255, 0.08)",
    primaryPressed: "#E9C574", primaryContrast: "#071A2A", primary: "#F2D58F", primarySoft: "#21354A",
  }, contentWidth), [theme.colors, contentWidth]);
  const compact = contentWidth < 360;
  const ready = !loading && !error && wallet !== null;
  const balance = hidden ? "•••••••• ₫" : ready ? formatVnd(wallet.availableBalance) : "";

  return (
    <View testID="wallet-summary-card" onLayout={({ nativeEvent }) => setCardWidth(nativeEvent.layout.width)} style={styles.card}>
      <View style={styles.backgroundImage}>
        <Image accessible={false} importantForAccessibility="no-hide-descendants" source={walletBackground} resizeMode="cover" style={styles.backgroundFill} />
      </View>
      <View style={styles.backgroundShade} />
      <WalletControl disabled={!ready} icon={hidden ? "eye-off-outline" : "eye-outline"}
        label={hidden ? "Hiện số dư" : "Ẩn số dư"} onPress={() => setHidden(value => !value)}
        variant="icon" styles={styles} />
      <View style={styles.headingRow}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.walletIcon}>
          <Ionicons color="#F2D58F" name="wallet-outline" size={compact ? 14 : 18} />
        </View>
        <View style={styles.titleGroup}>
          <Text accessibilityRole="header" style={styles.title}>Ví ANKT</Text>
          {!compact && <Text style={styles.subtitle}>Ví thanh toán của bạn</Text>}
        </View>
      </View>

      <View style={styles.funds}>
        <View style={styles.primaryBalance}>
          <View style={styles.balanceLabelRow}>
            <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
          </View>
          {loading ? (
            <View accessibilityLabel="Đang tải số dư" accessibilityRole="progressbar" style={styles.skeletonBalance} />
          ) : ready ? (
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.balance}>{balance}</Text>
          ) : (
            <View accessibilityRole={error ? "alert" : "text"} style={styles.errorCopy}>
              <Text style={styles.errorTitle}>{error ? "Không thể tải số dư" : "Số dư chưa sẵn sàng"}</Text>
              {onRetry ? <WalletControl icon="refresh-outline" label="Thử lại" onPress={onRetry} variant="retry" styles={styles} /> : null}
            </View>
          )}
        </View>

        {ready || loading ? <View style={styles.coinBalance}>
          {!compact && <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.coinIcon}>
            <Text style={styles.coinSymbol}>🪙</Text>
          </View>}
          <View style={styles.coinCopy}>
            {loading ? <View accessibilityLabel="Đang tải số dư ANKT" style={styles.skeletonCoin} /> : (
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.coinBalanceText}>{ready ? hidden ? "••••" : formatAnktCoin(wallet.anktCoinBalance).replace(/ ANKT coin$/, '') : "—"}<Text style={styles.coinLabel}> Xu ANKT</Text></Text>
            )}
          </View>
        </View> : null}
      </View>

      <View style={styles.actionRow}>
        <WalletControl disabled={!ready} icon="download-outline" label="Nạp tiền" onPress={onDeposit} variant="secondary" styles={styles} />
        <WalletControl disabled={!ready} icon="arrow-up-outline" label="Rút tiền" onPress={onWithdraw} variant="secondary" styles={styles} />
        <WalletControl disabled={!ready} icon="time-outline" label="Lịch sử" onPress={onHistory} variant="secondary" styles={styles} />
      </View>
    </View>
  );
}

type ControlVariant = "secondary" | "icon" | "retry";

function WalletControl({ disabled = false, icon, label, onPress, styles, variant }: {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  variant: ControlVariant;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Keep feedback static until the OS motion preference is resolved.
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReducedMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const iconOnly = variant !== "retry";
  const textStyle = styles.actionText;

  return (
    <View style={[styles.controlWrap, iconOnly && styles.toggleWrap, variant === "icon" && styles.privacyWrap, variant === "retry" && styles.retryWrap]}>
      <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
        hitSlop={variant === "secondary" ? 2 : undefined}
        onBlur={() => setFocused(false)} onFocus={() => setFocused(true)}
        onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onPress={onPress}
        style={({ pressed }) => [
          styles.action,
          variant === "secondary" ? styles.actionSecondary : styles.actionTertiary,
          iconOnly && styles.toggle, variant === "secondary" && styles.compactAction, variant === "retry" && styles.retry,
          !reducedMotion && styles.transition,
          hovered && !disabled && (variant === "icon" ? styles.privacyHover : styles.actionHover),
          pressed && styles.actionPressed, focused && (variant === "icon" ? styles.privacyHover : styles.actionFocused), disabled && styles.actionDisabled,
          variant === "icon" && styles.privacyButton,
        ]}>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Ionicons color={textStyle.color} name={icon} size={variant === "icon" ? 16 : 18} />
        </View>
        {!iconOnly && <Text style={textStyle}>{label}</Text>}
      </Pressable>
      {iconOnly && Platform.OS === "web" && (hovered || focused) && !disabled ? (
        <View testID="wallet-control-tooltip" style={[styles.tooltip, variant === "icon" && styles.privacyTooltip]}><Text style={styles.tooltipText}>{label}</Text></View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors, width: number) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, width: "100%", maxWidth: WALLET_CARD_MAX_WIDTH, aspectRatio: WALLET_CARD_ASPECT_RATIO, overflow: "hidden", alignSelf: "flex-start" },
  backgroundImage: { ...StyleSheet.absoluteFillObject, pointerEvents: "none" },
  backgroundFill: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  backgroundShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3, 14, 25, 0.28)", pointerEvents: "none" },
  headingRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, position: "absolute", left: 14, top: 10 },
  titleGroup: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { ...typography.title, fontSize: 16, lineHeight: 20, color: colors.text },
  subtitle: { ...typography.caption, fontSize: 12, lineHeight: 14, color: colors.textMuted },
  walletIcon: { alignItems: "center", justifyContent: "center", width: 22 },
  funds: { position: "absolute", top: width < 360 ? 40 : 58, left: 14, right: 14 },
  primaryBalance: { minWidth: 0 },
  balanceLabelRow: { justifyContent: "center", height: 16, alignItems: "flex-start" },
  balanceLabel: { color: colors.textMuted, fontSize: 12, lineHeight: 16, fontWeight: "500", flexShrink: 1 },
  balance: { color: colors.text, fontSize: width < 360 ? 22 : 28, fontWeight: "700", fontVariant: ["tabular-nums"], letterSpacing: -0.5, lineHeight: width < 360 ? 26 : 32, flexShrink: 1 },
  coinBalance: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 4, maxWidth: width < 360 ? Math.max(60, width - 204) : "100%" },
  coinIcon: { alignItems: "center", justifyContent: "center" },
  coinSymbol: { fontSize: 14, lineHeight: 18 },
  coinCopy: { minWidth: 0, gap: spacing.xs, flexShrink: 1 },
  coinLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "500" },
  coinBalanceText: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: "600", fontVariant: ["tabular-nums"] },
  actionRow: { position: "absolute", bottom: 8, right: 10, flexDirection: "row", gap: 4 },
  controlWrap: { minWidth: 0 },
  action: { alignItems: "center", borderColor: "transparent", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 44, width: 44 },
  actionSecondary: { backgroundColor: colors.secondaryBackground, borderColor: colors.borderSubtle },
  actionTertiary: { backgroundColor: "transparent" },
  actionText: { color: colors.text, fontSize: 14, fontWeight: "600", flexShrink: 1 },
  actionHover: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  actionPressed: { opacity: 0.82 },
  actionDisabled: { opacity: 0.45 },
  actionFocused: { borderColor: colors.primary, ...Platform.select({ web: { outlineColor: colors.primary, outlineOffset: 3, outlineStyle: "solid", outlineWidth: 2 } }) },
  transition: Platform.select({ web: { transitionDuration: "180ms", transitionProperty: "background-color, border-color, opacity" } as ViewStyle, default: {} }),
  toggleWrap: { zIndex: 1 },
  privacyWrap: { position: "absolute", right: 2, top: 0 },
  privacyButton: { backgroundColor: "transparent", borderWidth: 0, ...Platform.select({ web: { outlineStyle: "none" } }) },
  privacyHover: { opacity: 0.75 },
  retryWrap: { alignSelf: "flex-start" },
  toggle: { minHeight: 44, padding: 0, width: 44 },
  compactAction: { minHeight: 40, width: 40 },
  tooltip: { backgroundColor: "#21354A", borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: 6, bottom: "100%", marginBottom: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, position: "absolute", right: 0, minWidth: 104, pointerEvents: "none" },
  tooltipText: { color: colors.text, fontSize: 12, lineHeight: 18, fontWeight: "500" },
  privacyTooltip: { top: "100%", bottom: "auto", marginTop: 4, marginBottom: 0 },
  retry: { paddingHorizontal: 0, justifyContent: "flex-start", width: "auto" },
  errorCopy: { gap: spacing.xs },
  errorTitle: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: "600" },
  skeletonBalance: { backgroundColor: colors.secondaryBackground, borderRadius: 8, height: 26, marginVertical: 2, maxWidth: "100%", width: 180 },
  skeletonCoin: { backgroundColor: colors.borderSubtle, borderRadius: 4, height: 18, width: 80 },
});
