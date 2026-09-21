import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AnktCoinIcon } from "@/components/wallet/ankt-coin-icon";
import { spacing, type WalletTheme, useTheme } from "@/theme";
import type { Wallet } from "@/types/wallet";
import { formatVnd } from "@/utils/wallet-format";

type Props = {
  loading?: boolean;
  onDeposit: () => void;
  onHistory: () => void;
  onWithdraw: () => void;
  wallet: Wallet | null;
};

export function WalletSummaryCard({ loading, onDeposit, onHistory, onWithdraw, wallet }: Props) {
  const { theme } = useTheme();
  const [hidden, setHidden] = useState(false);
  const styles = useMemo(() => createStyles(theme.wallet), [theme.wallet]);

  if (loading) return <View accessibilityLabel="Đang tải Ví ANKT" accessibilityRole="progressbar" style={styles.card}><View style={styles.skeleton} /><View style={styles.skeletonBalance} /></View>;

  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.headingRow}>
        <View style={styles.titleGroup}><View style={styles.walletIcon}><Ionicons color={theme.wallet.accent} name="wallet" size={21} /></View><Text style={styles.title}>Ví ANKT</Text></View>
        <Pressable accessibilityLabel={hidden ? "Hiện số dư" : "Ẩn số dư"} hitSlop={10} onPress={() => setHidden((value) => !value)}><Ionicons color={theme.wallet.muted} name={hidden ? "eye-off-outline" : "eye-outline"} size={20} /></Pressable>
      </View>
      <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
      <Text style={styles.balance}>{hidden ? "•••••••• ₫" : formatVnd(wallet?.availableBalance ?? 0)}</Text>
      <View style={styles.coinBalance}><AnktCoinIcon size={24} /><Text style={styles.coinBalanceText}>{hidden ? "••••" : new Intl.NumberFormat("vi-VN").format(wallet?.anktCoinBalance ?? 0)} ANKT</Text></View>
      <View pointerEvents="none" style={styles.walletArtwork}><View style={styles.artCoin}><AnktCoinIcon size={52} /></View><View style={styles.walletBack} /><View style={styles.walletBody}><Ionicons color={theme.wallet.accent} name="wallet" size={48} /></View></View>
      <View style={styles.actionRow}>
        <WalletAction icon="card-outline" label="Nạp tiền" onPress={onDeposit} primary styles={styles} />
        <WalletAction icon="cash-outline" label="Rút tiền" onPress={onWithdraw} styles={styles} />
        <WalletAction icon="receipt-outline" label="Lịch sử" onPress={onHistory} styles={styles} />
      </View>
    </View>
  );
}

function WalletAction({ icon, label, onPress, primary, styles }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean; styles: ReturnType<typeof createStyles> }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [primary ? styles.actionPrimary : styles.actionSecondary, pressed && styles.actionPressed]}><Ionicons color={primary ? styles.actionPrimaryText.color : styles.actionSecondaryText.color} name={icon} size={16} /><Text style={primary ? styles.actionPrimaryText : styles.actionSecondaryText}>{label}</Text></Pressable>;
}

const createStyles = (wallet: WalletTheme) => StyleSheet.create({
  actionPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  actionPrimary: { alignItems: "center", backgroundColor: wallet.accent, borderColor: wallet.accent, borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: "row", gap: 4, justifyContent: "center", minHeight: 44, paddingHorizontal: 4 },
  actionPrimaryText: { color: wallet.accentContrast, fontSize: 11, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.lg, zIndex: 2 },
  actionSecondary: { alignItems: "center", backgroundColor: wallet.historyBackground, borderColor: wallet.accent, borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: "row", gap: 4, justifyContent: "center", minHeight: 44, paddingHorizontal: 4 },
  actionSecondaryText: { color: wallet.accent, fontSize: 11, fontWeight: "800" },
  artCoin: { left: 2, position: "absolute", top: 2, transform: [{ rotate: "-8deg" }] },
  balance: { color: wallet.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.6, marginTop: 1, zIndex: 2 },
  balanceLabel: { color: wallet.muted, fontSize: 11, fontWeight: "600", marginTop: spacing.md, zIndex: 2 },
  card: { backgroundColor: wallet.cardBackground, borderColor: wallet.cardBorder, borderRadius: 18, borderWidth: 1.25, minHeight: 236, overflow: "hidden", padding: spacing.lg },
  coinBalance: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, zIndex: 2 },
  coinBalanceText: { color: wallet.text, fontSize: 12, fontWeight: "800" },
  glow: { backgroundColor: wallet.glow, borderRadius: 150, height: 220, position: "absolute", right: -72, top: -64, transform: [{ rotate: "-16deg" }], width: 240 },
  headingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", zIndex: 3 },
  skeleton: { backgroundColor: wallet.skeleton, borderRadius: 8, height: 18, width: 110 },
  skeletonBalance: { backgroundColor: wallet.skeleton, borderRadius: 8, height: 34, marginTop: 30, width: 200 },
  title: { color: wallet.text, fontSize: 17, fontWeight: "800" },
  titleGroup: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  walletArtwork: { height: 88, position: "absolute", right: 18, top: 61, width: 112, zIndex: 1 },
  walletBack: { backgroundColor: wallet.walletBack, borderRadius: 13, bottom: 10, height: 56, position: "absolute", right: 5, transform: [{ rotate: "8deg" }], width: 68 },
  walletBody: { alignItems: "center", backgroundColor: wallet.walletBody, borderColor: wallet.accent, borderRadius: 16, borderWidth: 1.5, bottom: 1, height: 61, justifyContent: "center", position: "absolute", right: 0, transform: [{ rotate: "-7deg" }], width: 78, zIndex: 2 },
  walletIcon: { alignItems: "center", backgroundColor: wallet.iconBackground, borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
});
