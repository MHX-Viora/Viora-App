import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from "react-native";

import { spacing, typography, type ThemeColors, useTheme } from "@/theme";
import type { Wallet } from "@/types/wallet";
import { formatVnd } from "@/utils/wallet-format";
import { formatAnktCoin } from "@/utils/money";

const walletBackground = require("../../assets/images/wallet-card-background.png");

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
  const styles = useMemo(() => createStyles({
    ...theme.colors,
    surface: "#071A2A",
    text: "#F4F8FC",
    textMuted: "#BDD0E0",
    borderSubtle: "#24495D",
    secondaryBackground: "rgba(5, 22, 37, 0.85)",
  }), [theme.colors]);
  const contentWidth = cardWidth || Math.min(728, Math.max(0, width - spacing.lg * 2));
  const compact = contentWidth < 480;
  const wide = contentWidth >= 600;
  const ready = !loading && !error && wallet !== null;
  const balance = hidden ? "•••••••• ₫" : ready ? formatVnd(wallet.availableBalance) : "";

  return (
    <View onLayout={({ nativeEvent }) => setCardWidth(nativeEvent.layout.width)} style={[styles.card, !compact && styles.cardWide]}>
      <View style={styles.backgroundImage}>
        <Image accessible={false} importantForAccessibility="no-hide-descendants" source={walletBackground} resizeMode="cover" style={styles.backgroundFill} />
      </View>
      <View style={styles.backgroundShade} />
      <View style={styles.headingRow}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.walletIcon}>
          <Ionicons color={theme.colors.primary} name="wallet-outline" size={24} />
        </View>
        <View style={styles.titleGroup}>
          <Text accessibilityRole="header" style={styles.title}>Ví ANKT</Text>
          <Text style={styles.subtitle}>Ví thanh toán của bạn</Text>
        </View>
      </View>

      <View style={[styles.funds, wide && styles.fundsWide]}>
        <View style={[styles.primaryBalance, wide && styles.primaryBalanceWide]}>
          <View style={styles.balanceLabelRow}>
            <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
            <WalletControl disabled={!ready} icon={hidden ? "eye-off-outline" : "eye-outline"}
              label={hidden ? "Hiện số dư" : "Ẩn số dư"} onPress={() => setHidden(value => !value)}
              variant="icon" styles={styles} />
          </View>
          {loading ? (
            <View accessibilityLabel="Đang tải số dư" accessibilityRole="progressbar" style={styles.skeletonBalance} />
          ) : ready ? (
            <Text style={[styles.balance, compact && styles.balanceCompact, balance.length > 18 && styles.balanceLong]}>{balance}</Text>
          ) : (
            <View accessibilityRole={error ? "alert" : "text"} style={styles.errorCopy}>
              <Text style={styles.errorTitle}>{error ? "Không thể tải số dư" : "Số dư chưa sẵn sàng"}</Text>
              <Text style={styles.subtitle}>Vui lòng thử lại sau ít phút.</Text>
              {onRetry ? <WalletControl icon="refresh-outline" label="Thử lại" onPress={onRetry} variant="retry" styles={styles} /> : null}
            </View>
          )}
        </View>

        <View style={[styles.coinBalance, wide && styles.coinBalanceWide]}>
          <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.coinIcon}>
            <Ionicons color={theme.colors.textMuted} name="layers-outline" size={20} />
          </View>
          <View style={styles.coinCopy}>
            <Text style={styles.coinLabel}>ANKT coin</Text>
            {loading ? <View accessibilityLabel="Đang tải số dư ANKT" style={styles.skeletonCoin} /> : (
              <Text style={styles.coinBalanceText}>{ready ? hidden ? "•••• ANKT" : formatAnktCoin(wallet.anktCoinBalance) : "Chưa có dữ liệu"}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.actionRow, compact && styles.actionRowCompact]}>
        <WalletControl disabled={!ready} fullWidth={compact} icon="add-outline" label="Nạp tiền" onPress={onDeposit} variant="primary" styles={styles} />
        <View style={[styles.secondaryActions, compact && styles.secondaryActionsCompact]}>
          <WalletControl disabled={!ready} icon="arrow-up-outline" label="Rút tiền" onPress={onWithdraw} variant="secondary" styles={styles} />
          <WalletControl disabled={!ready} icon="time-outline" label="Lịch sử" onPress={onHistory} variant="tertiary" styles={styles} />
        </View>
      </View>
    </View>
  );
}

type ControlVariant = "primary" | "secondary" | "tertiary" | "icon" | "retry";

function WalletControl({ disabled = false, fullWidth = false, icon, label, onPress, styles, variant }: {
  disabled?: boolean;
  fullWidth?: boolean;
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
  const primary = variant === "primary";
  const iconOnly = variant === "icon";
  const textStyle = primary ? styles.actionPrimaryText : styles.actionText;

  return (
    <View style={[styles.controlWrap, fullWidth && styles.controlWrapFull, (iconOnly || variant === "retry") && styles.controlWrapSmall, iconOnly && styles.toggleWrap]}>
      <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
        onBlur={() => setFocused(false)} onFocus={() => setFocused(true)}
        onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onPress={onPress}
        style={({ pressed }) => [
          styles.action,
          primary ? styles.actionPrimary : variant === "secondary" ? styles.actionSecondary : styles.actionTertiary,
          iconOnly && styles.toggle, variant === "retry" && styles.retry,
          !reducedMotion && styles.transition,
          hovered && !disabled && (primary ? styles.actionPrimaryHover : styles.actionHover),
          pressed && styles.actionPressed, focused && styles.actionFocused, disabled && styles.actionDisabled,
        ]}>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Ionicons color={textStyle.color} name={icon} size={20} />
        </View>
        {!iconOnly && <Text style={textStyle}>{label}</Text>}
      </Pressable>
      {iconOnly && Platform.OS === "web" && (hovered || focused) && !disabled ? (
        <View style={styles.tooltip}><Text style={styles.tooltipText}>{label}</Text></View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, padding: spacing.lg, overflow: "hidden" },
  backgroundImage: { ...StyleSheet.absoluteFillObject, pointerEvents: "none" },
  backgroundFill: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  backgroundShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3, 14, 25, 0.28)", pointerEvents: "none" },
  cardWide: { padding: spacing.xl },
  headingRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  titleGroup: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted },
  walletIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 12, height: 48, justifyContent: "center", width: 48 },
  funds: { gap: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.xl },
  fundsWide: { alignItems: "center", flexDirection: "row", gap: spacing.xl },
  primaryBalance: { minWidth: 0 },
  primaryBalanceWide: { flex: 1 },
  balanceLabelRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  balanceLabel: { color: colors.textMuted, fontSize: 14, fontWeight: "500", flexShrink: 1 },
  balance: { color: colors.text, fontSize: 40, fontWeight: "700", fontVariant: ["tabular-nums"], letterSpacing: -0.8, lineHeight: 52, flexShrink: 1 },
  balanceCompact: { fontSize: 32, lineHeight: 44, letterSpacing: -0.5 },
  balanceLong: { fontSize: 26, lineHeight: 40 },
  coinBalance: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.secondaryBackground, borderRadius: 12, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  coinBalanceWide: { minWidth: 152 },
  coinIcon: { alignItems: "center", justifyContent: "center" },
  coinCopy: { minWidth: 0, gap: spacing.xs, flexShrink: 1 },
  coinLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "500" },
  coinBalanceText: { color: colors.text, fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] },
  actionRow: { borderTopColor: colors.borderSubtle, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, paddingTop: spacing.lg },
  actionRowCompact: { flexDirection: "column" },
  secondaryActions: { flex: 2, flexDirection: "row", gap: spacing.md, minWidth: 0 },
  secondaryActionsCompact: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: "100%" },
  controlWrap: { flex: 1, minWidth: 0 },
  controlWrapFull: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: "100%" },
  controlWrapSmall: { alignSelf: "flex-start", flex: 0 },
  action: { alignItems: "center", borderColor: "transparent", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionPrimary: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed },
  actionSecondary: { backgroundColor: colors.secondaryBackground, borderColor: colors.borderSubtle },
  actionTertiary: { backgroundColor: "transparent" },
  actionText: { color: colors.text, fontSize: 14, fontWeight: "600", flexShrink: 1 },
  actionPrimaryText: { color: colors.primaryContrast, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  actionHover: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  actionPrimaryHover: { borderColor: colors.text },
  actionPressed: { opacity: 0.82 },
  actionDisabled: { opacity: 0.45 },
  actionFocused: { borderColor: colors.primary, ...Platform.select({ web: { outlineColor: colors.primary, outlineOffset: 3, outlineStyle: "solid", outlineWidth: 2 } }) },
  transition: Platform.select({ web: { transitionDuration: "180ms", transitionProperty: "background-color, border-color, opacity" } as ViewStyle, default: {} }),
  toggleWrap: { zIndex: 1 },
  toggle: { minHeight: 44, padding: 0, width: 44 },
  tooltip: { backgroundColor: colors.text, borderRadius: 6, bottom: "100%", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, position: "absolute", left: 0, minWidth: 104, pointerEvents: "none" },
  tooltipText: { color: colors.background, fontSize: 12, fontWeight: "500" },
  retry: { paddingHorizontal: 0, justifyContent: "flex-start" },
  errorCopy: { gap: spacing.xs },
  errorTitle: { color: colors.text, fontSize: 18, fontWeight: "600" },
  skeletonBalance: { backgroundColor: colors.secondaryBackground, borderRadius: 8, height: 44, marginVertical: spacing.xs, maxWidth: "100%", width: 240 },
  skeletonCoin: { backgroundColor: colors.borderSubtle, borderRadius: 4, height: 18, width: 80 },
});
