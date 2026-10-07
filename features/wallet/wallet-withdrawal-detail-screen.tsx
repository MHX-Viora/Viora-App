import Ionicons from "@expo/vector-icons/Ionicons";
import { formatFeePercent } from "@/utils/money";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WalletScreenHeader } from "@/components/wallet/wallet-screen-header";
import { useResponsive } from "@/hooks/use-responsive";
import { cancelWalletWithdrawal, getWalletWithdrawal, invalidateWalletData } from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { WalletWithdrawal } from "@/types/wallet";
import { formatVnd, withdrawalStatusLabel } from "@/utils/wallet-format";

export function WalletWithdrawalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [item, setItem] = useState<WalletWithdrawal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try { setItem(await getWalletWithdrawal(id)); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải yêu cầu rút tiền."); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const cancel = async () => {
    if (!item || item.status !== 0 || busy.current) return;
    busy.current = true; setSubmitting(true);
    try { setItem(await cancelWalletWithdrawal(item.id)); invalidateWalletData(); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể hủy yêu cầu."); await load(); }
    finally { busy.current = false; setSubmitting(false); setConfirming(false); }
  };
  const successful = item?.status === 2;
  const pending = item != null && item.status < 2;
  const tone = successful ? theme.colors.success : pending ? theme.colors.warning : theme.colors.textMuted;
  const fields = item ? [["Mã giao dịch", item.transactionCode], ["Gửi lúc", new Date(item.createdAt).toLocaleString("vi-VN")], ["Ngân hàng", item.bankName], ["Tài khoản", item.bankAccountMasked], ["Chủ tài khoản", item.bankAccountHolderName], ["Số tiền yêu cầu", formatVnd(item.amount)], [item.feePercent != null ? `Phí (${formatFeePercent(item.feePercent)})` : "Phí", formatVnd(item.fee)], ["Thực nhận", formatVnd(item.netAmount)]] : [];
  return <SafeAreaView style={styles.screen}><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={theme.colors.primary} />} contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]}>
    <WalletScreenHeader title="Chi tiết rút tiền" />
    {error && <Pressable accessibilityRole="button" onPress={() => void load()}><Text accessibilityRole="alert" style={styles.error}>{error} Nhấn để tải lại.</Text></Pressable>}
    {!item ? <Text style={styles.label}>{loading ? "Đang tải yêu cầu…" : "Chưa tải được yêu cầu."}</Text> : <>
      <View style={styles.hero}><Ionicons color={tone} name={successful ? "checkmark-circle" : pending ? "time" : "close-circle"} size={52} /><Text style={styles.label}>{successful ? "Số tiền thực nhận" : pending ? "Thực nhận dự kiến" : "Số tiền đã yêu cầu"}</Text><Text style={styles.amount}>{formatVnd(pending || successful ? item.netAmount : item.amount)}</Text><Text style={{ color: tone }}>{withdrawalStatusLabel(item.status)}</Text><Text style={styles.hint}>{pending ? `Đang giữ ${formatVnd(item.amount)} để xử lý yêu cầu. Số tiền này đã được trừ khỏi khả dụng.` : successful ? "Tiền đã được chuyển về tài khoản ngân hàng." : `Đã giải phóng ${formatVnd(item.amount)} về số dư khả dụng.`}</Text></View>
      <View style={styles.details}>{fields.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>)}</View>
      {item.failureReason && <View style={styles.details}><Text style={styles.label}>Lý do xử lý</Text><Text style={styles.value}>{item.failureReason}</Text></View>}
      <View style={styles.details}><Text style={styles.sectionTitle}>Lịch sử xử lý</Text>{(item.timeline ?? [{ status: 0, at: item.createdAt, reason: null }]).map((event, index) => <View style={styles.row} key={event.at + index}><View><Text style={styles.value}>{withdrawalStatusLabel(event.status)}</Text><Text style={styles.label}>{new Date(event.at).toLocaleString("vi-VN")}</Text>{event.reason && <Text style={styles.label}>{event.reason}</Text>}</View></View>)}</View>
      {item.status === 0 && <Pressable accessibilityRole="button" disabled={submitting} style={styles.button} onPress={() => setConfirming(true)}><Text style={styles.buttonText}>Hủy yêu cầu rút tiền</Text></Pressable>}
    </>}
  </ScrollView><Modal transparent visible={confirming} onRequestClose={() => !submitting && setConfirming(false)} animationType="fade"><View style={styles.overlay}><View style={styles.dialog}><Text style={styles.sectionTitle}>Hủy yêu cầu rút tiền?</Text><Text style={styles.hint}>Toàn bộ {formatVnd(item?.amount)} sẽ được giải phóng về số dư khả dụng nếu yêu cầu vẫn đang chờ duyệt.</Text><Pressable accessibilityRole="button" disabled={submitting} style={styles.button} onPress={() => void cancel()}><Text style={styles.buttonText}>{submitting ? "Đang hủy…" : "Xác nhận hủy"}</Text></Pressable><Pressable accessibilityRole="button" disabled={submitting} style={styles.button} onPress={() => setConfirming(false)}><Text style={styles.buttonText}>Giữ yêu cầu</Text></Pressable></View></View></Modal></SafeAreaView>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48 }, desktop: { alignSelf: "center", maxWidth: 620, width: "100%" },
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }, amount: { color: colors.text, fontSize: 32, fontWeight: "800", textAlign: "center" }, hint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  details: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, padding: spacing.lg }, row: { borderBottomColor: colors.borderSubtle, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", paddingVertical: spacing.md }, label: { color: colors.textMuted, fontSize: 13 }, value: { color: colors.text, flexShrink: 1, fontSize: 13, fontWeight: "700", textAlign: "right" }, error: { color: colors.danger },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700" }, button: { borderColor: colors.border, borderWidth: 1, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center", padding: 12 }, buttonText: { color: colors.primary, fontWeight: "700" }, overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 24 }, dialog: { backgroundColor: colors.surface, padding: 24, borderRadius: 20, gap: 20, maxWidth: 520, width: "100%", alignSelf: "center" },
});
