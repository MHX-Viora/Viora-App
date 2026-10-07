import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WalletScreenHeader } from "@/components/wallet/wallet-screen-header";
import { WalletTransactionRow } from "@/components/wallet/wallet-transaction-row";
import { useResponsive } from "@/hooks/use-responsive";
import { getWalletTransactions, subscribeWalletDataInvalidation } from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { WalletHistoryGroup, WalletTransaction } from "@/types/wallet";
import { walletHistoryMonth } from "@/utils/wallet-format";

const FILTERS: { label: string; group?: WalletHistoryGroup }[] = [
  { label: "Tất cả" }, { label: "Nạp tiền", group: 0 }, { label: "Rút tiền", group: 1 },
  { label: "Thanh toán", group: 2 }, { label: "Hoàn tiền", group: 3 },
];

export function WalletHistoryScreen() {
  const { theme } = useTheme(); const { isDesktopWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [group, setGroup] = useState<WalletHistoryGroup | undefined>();
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const load = useCallback(async (nextPage = 1, append = false) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const result = await getWalletTransactions({ page: nextPage, pageSize: 20, group });
      if (currentRequest !== requestId.current) return;
      setItems((current) => append ? [...current, ...result.data] : result.data);
      setPage(result.page); setTotalPages(result.totalPages);
      setError(null);
    } catch (reason) {
      if (currentRequest === requestId.current) setError(reason instanceof Error ? reason.message : "Không thể tải lịch sử. Vui lòng thử lại.");
    } finally { if (currentRequest === requestId.current) setLoading(false); }
  }, [group]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => subscribeWalletDataInvalidation(() => { void load(); }), [load]);
  const grouped = useMemo(() => items.reduce<Record<string, WalletTransaction[]>>((result, item) => { const key = walletHistoryMonth(item.createdAt); (result[key] ??= []).push(item); return result; }, {}), [items]);
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]}>
    <WalletScreenHeader title="Lịch sử giao dịch" />
    <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
      {FILTERS.map((filter) => <Pressable key={filter.label} onPress={() => {
        if (group === filter.group) return;
        requestId.current += 1;
        setItems([]); setPage(1); setTotalPages(1); setGroup(filter.group);
      }} style={[styles.filter, group === filter.group && styles.filterActive]}><Text style={[styles.filterText, group === filter.group && styles.filterTextActive]}>{filter.label}</Text></Pressable>)}
    </ScrollView>
    {error && <Pressable onPress={() => void load()}><Text style={styles.error}>{error} Nhấn để thử lại.</Text></Pressable>}
    {loading && items.length === 0 && <Text accessibilityLiveRegion="polite" style={styles.empty}>Đang tải lịch sử giao dịch…</Text>}
    {Object.entries(grouped).map(([month, transactions]) => <View key={month}><Text style={styles.month}>{month}</Text><View style={styles.group}>{transactions.map((item) => <WalletTransactionRow item={item} key={item.id} onPress={() => router.push(`/wallet/transaction/${item.id}` as Href)} />)}</View></View>)}
    {!loading && !error && items.length === 0 && <Text style={styles.empty}>Chưa có giao dịch phù hợp.</Text>}
    {page < totalPages && <Pressable disabled={loading} onPress={() => void load(page + 1, true)} style={styles.more}><Text style={styles.moreText}>{loading ? "Đang tải…" : "Tải thêm"}</Text></Pressable>}
  </ScrollView></SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48 },
  desktop: { alignSelf: "center", maxWidth: 760, width: "100%" },
  empty: { color: colors.textMuted, padding: 40, textAlign: "center" },
  error: { color: colors.danger, padding: spacing.md },
  filter: { borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  filterActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filters: { gap: spacing.sm },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: colors.primary },
  group: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 16, borderWidth: 1, paddingHorizontal: spacing.lg },
  month: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm, textTransform: "capitalize" },
  more: { alignItems: "center", borderColor: colors.border, borderRadius: 14, borderWidth: 1, padding: spacing.md },
  moreText: { color: colors.primary, fontWeight: "800" },
  screen: { backgroundColor: colors.background, flex: 1 },
});
