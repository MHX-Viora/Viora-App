import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { WalletTransaction } from "@/types/wallet";
import { walletTransactionDirection, walletTransactionDisplayAmount, walletTransactionRoute, walletTransactionStatusLabel, walletTransactionTitle, walletTransactionTone, withdrawalStatusLabel } from "@/utils/wallet-format";

export function WalletTransactionRow({ item, onPress }: { item: WalletTransaction; onPress: () => void }) {
  const { theme } = useTheme(); const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const tone = walletTransactionTone(item);
  const statusLabel = item.type === 7 && item.withdrawalStatus != null ? withdrawalStatusLabel(item.withdrawalStatus) : walletTransactionStatusLabel(item);
  const neutralStatus = (item.type === 0 && (item.paymentStatus === 3 || item.paymentStatus === 4)) || (item.type === 7 && (item.withdrawalStatus === 4 || item.withdrawalStatus === 5)) || item.status === 3;
  const statusColor = tone === "success" ? item.type === 4 ? theme.colors.primary : theme.colors.success : tone === "pending" ? theme.colors.warning : neutralStatus ? theme.colors.textMuted : theme.colors.danger;
  const direction = walletTransactionDirection(item);
  const amountColor = tone === "success" && (direction === "incoming" || direction === "released") ? theme.colors.success : theme.colors.text;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    <View style={styles.copy}>
      <Text style={styles.title}>{walletTransactionTitle(item)}</Text>
      <Text numberOfLines={1} style={styles.route}>{walletTransactionRoute(item)}</Text>
      {(item.type === 10 || item.type === 11) && item.description ? <Text numberOfLines={2} style={styles.related}>{item.description}</Text> : null}
      {item.relatedContent ? <Text numberOfLines={1} style={styles.related}>{item.type === 10 || item.type === 11 ? "Quà Live" : "Bài viết"}: {item.relatedContent}</Text> : null}
      <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString("vi-VN")}</Text>
    </View>
    <View style={styles.amountWrap}>
      <Text style={[styles.amount, { color: amountColor }]}>{walletTransactionDisplayAmount(item)}</Text>
      <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
    </View>
  </Pressable>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ amount: { fontSize: 14, fontWeight: "800" }, amountWrap: { alignItems: "flex-end", gap: 4 }, copy: { flex: 1, minWidth: 0 }, meta: { color: colors.textMuted, fontSize: 11, marginTop: 4 }, related: { color: colors.textMuted, fontSize: 11, marginTop: 3 }, route: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, pressed: { opacity: 0.68 }, row: { alignItems: "center", borderBottomColor: colors.borderSubtle, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", paddingVertical: spacing.md }, status: { fontSize: 11, fontWeight: "700" }, title: { color: colors.text, fontSize: 14, fontWeight: "700" } });
