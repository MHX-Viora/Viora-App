import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WalletScreenHeader } from "@/components/wallet/wallet-screen-header";
import { useResponsive } from "@/hooks/use-responsive";
import { getWalletTransaction, getWalletWithdrawal, subscribeWalletDataInvalidation } from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { WalletTransaction, WalletWithdrawal } from "@/types/wallet";
import { formatVnd, walletTransactionDirection, walletTransactionDisplayAmount, walletTransactionEndpoints, walletTransactionStatusLabel, walletTransactionTitle, walletTransactionTone, withdrawalStatusLabel } from "@/utils/wallet-format";

export function WalletTransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme(); const { isDesktopWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [item, setItem] = useState<WalletTransaction | null>(null);
  const [withdrawal, setWithdrawal] = useState<WalletWithdrawal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const result = await getWalletTransaction(id);
      setItem(result);
      setWithdrawal(result.referenceType === "Withdrawal" ? await getWalletWithdrawal(result.referenceId) : null);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải giao dịch.");
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeWalletDataInvalidation(() => { void load(); }), [load]);
  if (!item) return <SafeAreaView style={styles.screen}><View style={[styles.content, isDesktopWeb && styles.desktop]}><WalletScreenHeader title="Chi tiết giao dịch" /><Text style={error ? styles.error : styles.muted}>{error ?? "Đang tải giao dịch…"}</Text></View></SafeAreaView>;
  const direction = walletTransactionDirection(item);
  const tone = walletTransactionTone(item);
  const amountColor = tone === "success" && (direction === "incoming" || direction === "released") ? theme.colors.success : theme.colors.text;
  const statusLabel = withdrawal ? withdrawalStatusLabel(withdrawal.status) : walletTransactionStatusLabel(item);
  const [source, destination] = walletTransactionEndpoints(item);
  const fields = [
    ["Trạng thái", statusLabel],
    ["Nguồn", source], ["Đích", destination],
    ["Thời gian tạo", new Date(item.createdAt).toLocaleString("vi-VN")],
    ...(item.completedAt ? [[tone === "success" ? "Hoàn thành" : "Cập nhật lúc", new Date(item.completedAt).toLocaleString("vi-VN")]] : []),
    ...(withdrawal ? [["Mã giao dịch", withdrawal.transactionCode], ["Phí", formatVnd(withdrawal.fee)], ["Thực nhận", formatVnd(withdrawal.netAmount)]] : []),
    ...(item.relatedContent ? [["Bài viết", item.relatedContent]] : []),
    ...(item.description && item.type !== 0 ? [["Nội dung", item.description]] : []),
    ...(item.hasBalanceSnapshot !== false && item.status === 1 ? item.coinAmount != null ? [["Coin trước", `${item.coinBalanceBefore?.toLocaleString("vi-VN") ?? "—"} ANKT coin`], ["Coin sau", `${item.coinBalanceAfter?.toLocaleString("vi-VN") ?? "—"} ANKT coin`]] : [["Khả dụng trước", formatVnd(item.balanceBefore)], ["Khả dụng sau", formatVnd(item.balanceAfter)], ["Tạm giữ trước", formatVnd(item.heldBefore)], ["Tạm giữ sau", formatVnd(item.heldAfter)]] : []),
  ];
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]}><WalletScreenHeader title="Chi tiết giao dịch" /><View style={styles.hero}><Text style={[styles.amount, { color: amountColor }]}>{walletTransactionDisplayAmount(item)}</Text><Text style={styles.type}>{walletTransactionTitle(item)}</Text><Text style={[styles.heroStatus, { color: tone === "success" ? theme.colors.success : tone === "pending" ? theme.colors.warning : theme.colors.textMuted }]}>{statusLabel}</Text></View><View style={styles.details}>{fields.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>)}</View>{item.type === 0 && item.paymentStatus === 0 && item.referenceType === "Payment" ? <Pressable onPress={() => router.push({ pathname: "/wallet/deposit", params: { paymentId: item.referenceId } })} style={styles.action}><Text style={styles.actionText}>Xem mã QR thanh toán</Text></Pressable> : null}</ScrollView></SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ action: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 14, padding: spacing.md }, actionText: { color: colors.primaryContrast, fontWeight: "800" }, amount: { fontSize: 34, fontWeight: "900" }, content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48 }, desktop: { alignSelf: "center", maxWidth: 620, width: "100%" }, details: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, padding: spacing.lg }, error: { color: colors.danger, textAlign: "center" }, hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }, heroStatus: { fontSize: 13, fontWeight: "700" }, label: { color: colors.textMuted, fontSize: 13 }, muted: { color: colors.textMuted, textAlign: "center" }, row: { borderBottomColor: colors.borderSubtle, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", paddingVertical: spacing.md }, screen: { backgroundColor: colors.background, flex: 1 }, type: { color: colors.textMuted, fontSize: 14, fontWeight: "700" }, value: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700", textAlign: "right" } });
