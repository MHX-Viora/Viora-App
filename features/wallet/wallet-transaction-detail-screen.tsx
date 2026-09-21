import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WalletScreenHeader } from "@/components/wallet/wallet-screen-header";
import { useResponsive } from "@/hooks/use-responsive";
import { getWalletTransaction, getWalletWithdrawal, subscribeWalletDataInvalidation } from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { WalletTransaction, WalletWithdrawal } from "@/types/wallet";
import { formatVnd, walletTransactionLabel, walletTransactionSign, walletTransactionStatusLabel, withdrawalStatusLabel } from "@/utils/wallet-format";

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
  const incoming = item.amount > 0;
  const fields = [["Trạng thái", withdrawal ? withdrawalStatusLabel(withdrawal.status) : walletTransactionStatusLabel(item)], ["Thời gian", new Date(item.createdAt).toLocaleString("vi-VN")], ["Mã giao dịch", withdrawal?.transactionCode ?? item.id], ["Loại", walletTransactionLabel(item.type)], ["Nội dung", item.description ?? "—"], ...(withdrawal ? [["Ngân hàng", withdrawal.bankName], ["Tài khoản", withdrawal.bankAccountMasked], ["Phí", formatVnd(withdrawal.fee)], ["Thực nhận", formatVnd(withdrawal.netAmount)]] : []), ["Số dư trước", formatVnd(item.balanceBefore)], ["Số dư sau", formatVnd(item.balanceAfter)]];
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]}><WalletScreenHeader title="Chi tiết giao dịch" /><View style={styles.hero}><Ionicons color={incoming ? theme.colors.success : theme.colors.danger} name={incoming ? "checkmark-circle" : "arrow-up-circle"} size={58} /><Text style={[styles.amount, { color: incoming ? theme.colors.success : theme.colors.danger }]}>{walletTransactionSign(item.amount)}</Text><Text style={styles.type}>{walletTransactionLabel(item.type)}</Text></View><View style={styles.details}>{fields.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>)}</View></ScrollView></SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ amount: { fontSize: 34, fontWeight: "900" }, content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48 }, desktop: { alignSelf: "center", maxWidth: 620, width: "100%" }, details: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, padding: spacing.lg }, error: { color: colors.danger, textAlign: "center" }, hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }, label: { color: colors.textMuted, fontSize: 13 }, muted: { color: colors.textMuted, textAlign: "center" }, row: { borderBottomColor: colors.borderSubtle, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", paddingVertical: spacing.md }, screen: { backgroundColor: colors.background, flex: 1 }, type: { color: colors.textMuted, fontSize: 14, fontWeight: "700" }, value: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700", textAlign: "right" } });
