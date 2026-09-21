import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WalletScreenHeader } from "@/components/wallet/wallet-screen-header";
import { WalletSummaryCard } from "@/components/wallet/wallet-summary-card";
import { WalletTransactionRow } from "@/components/wallet/wallet-transaction-row";
import { useResponsive } from "@/hooks/use-responsive";
import { getWallet, getWalletTransactions, subscribeWalletDataInvalidation } from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { Wallet, WalletTransaction } from "@/types/wallet";

export function WalletDetailScreen() {
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [recent, setRecent] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [walletResult, transactionResult] = await Promise.all([getWallet(), getWalletTransactions({ pageSize: 5 })]);
      setWallet(walletResult);
      setRecent(transactionResult.data);
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => subscribeWalletDataInvalidation(() => { void load(); }), [load]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]}>
        <WalletScreenHeader title="Ví ANKT" right={<Pressable accessibilityLabel="Trợ giúp Ví ANKT" onPress={() => router.push("/support")}><Ionicons color={theme.colors.text} name="help-circle-outline" size={23} /></Pressable>} />
        <WalletSummaryCard
          loading={loading}
          onDeposit={() => router.push("/wallet/deposit")}
          onHistory={() => router.push("/wallet/history")}
          onWithdraw={() => router.push("/wallet/withdraw")}
          wallet={wallet}
        />
        <Pressable accessibilityRole="button" onPress={() => router.push("/support")} style={styles.securityCard}>
          <View style={styles.securityIcon}><Ionicons color={theme.colors.primary} name="shield-checkmark-outline" size={25} /></View>
          <View style={styles.securityCopy}><Text style={styles.securityTitle}>Sử dụng ví an toàn</Text><Text style={styles.securityBody}>Ví ANKT sử dụng nhiều lớp bảo vệ để hỗ trợ giao dịch an toàn hơn.</Text></View>
          <Ionicons color={theme.colors.textMuted} name="chevron-forward" size={19} />
        </Pressable>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Giao dịch gần đây</Text><Pressable onPress={() => router.push("/wallet/history")}><Text style={styles.link}>Xem tất cả</Text></Pressable></View>
        <View style={styles.transactions}>
          {loading ? <Text style={styles.empty}>Đang tải giao dịch…</Text> : recent.length === 0 ? <Text style={styles.empty}>Chưa có giao dịch nào.</Text> : recent.map((item) => <WalletTransactionRow item={item} key={item.id} onPress={() => router.push(`/wallet/transaction/${item.id}` as Href)} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48 }, desktop: { alignSelf: "center", maxWidth: 760, width: "100%" },
  empty: { color: colors.textMuted, paddingVertical: spacing.xl, textAlign: "center" },
  link: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  screen: { backgroundColor: colors.background, flex: 1 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm }, sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  securityBody: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 }, securityCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, securityCopy: { flex: 1 }, securityIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 22, height: 44, justifyContent: "center", width: 44 }, securityTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  transactions: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 16, borderWidth: 1, paddingHorizontal: spacing.lg },
});
