import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WalletScreenHeader } from "@/components/wallet/wallet-screen-header";
import { useResponsive } from "@/hooks/use-responsive";
import { getWalletWithdrawal } from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { WalletWithdrawal } from "@/types/wallet";
import { formatVnd, withdrawalStatusLabel } from "@/utils/wallet-format";

export function WalletWithdrawalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme(); const { isDesktopWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [item, setItem] = useState<WalletWithdrawal | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (id) void getWalletWithdrawal(id).then(setItem).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải yêu cầu rút tiền.")); }, [id]);
  if (!item) return <SafeAreaView style={styles.screen}><View style={[styles.content, isDesktopWeb && styles.desktop]}><WalletScreenHeader title="Chi tiết rút tiền" /><Text style={error ? styles.error : styles.muted}>{error ?? "Đang tải…"}</Text></View></SafeAreaView>;
  const successful = item.status === 2; const pending = item.status < 2;
  const fields = [["Trạng thái", withdrawalStatusLabel(item.status)], ["Mã giao dịch", item.transactionCode], ["Thời gian", new Date(item.createdAt).toLocaleString("vi-VN")], ["Ngân hàng", item.bankName], ["Tài khoản", item.bankAccountMasked], ["Chủ tài khoản", item.bankAccountHolderName], ["Số tiền rút", formatVnd(item.amount)], ["Phí", formatVnd(item.fee)], ["Thực nhận", formatVnd(item.netAmount)], ...(item.failureReason ? [["Lý do", item.failureReason]] : [])];
  const tone = successful ? theme.colors.success : pending ? theme.colors.warning : theme.colors.danger;
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]}><WalletScreenHeader title="Chi tiết rút tiền" /><View style={styles.hero}><Ionicons color={tone} name={successful ? "checkmark-circle" : pending ? "time" : "close-circle"} size={58} /><Text style={[styles.amount, { color: tone }]}>{formatVnd(-item.amount)}</Text><View style={[styles.badge, { backgroundColor: pending ? theme.colors.warningSoft : successful ? theme.colors.successSoft : theme.colors.dangerSoft }]}><Text style={[styles.badgeText, { color: tone }]}>{withdrawalStatusLabel(item.status)}</Text></View></View><View style={styles.details}>{fields.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>)}</View></ScrollView></SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ amount: { fontSize: 32, fontWeight: "900" }, badge: { borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 6 }, badgeText: { fontSize: 12, fontWeight: "900" }, content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48 }, desktop: { alignSelf: "center", maxWidth: 620, width: "100%" }, details: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, padding: spacing.lg }, error: { color: colors.danger, textAlign: "center" }, hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }, label: { color: colors.textMuted, fontSize: 13 }, muted: { color: colors.textMuted, textAlign: "center" }, row: { borderBottomColor: colors.borderSubtle, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", paddingVertical: spacing.md }, screen: { backgroundColor: colors.background, flex: 1 }, value: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700", textAlign: "right" } });
