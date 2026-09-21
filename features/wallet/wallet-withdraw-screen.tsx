import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WalletScreenHeader } from "@/components/wallet/wallet-screen-header";
import { useResponsive } from "@/hooks/use-responsive";
import {
  createWalletBankAccount,
  createWalletWithdrawal,
  createWithdrawalIdempotencyKey,
  getWallet,
  getWalletBankAccounts,
  getWithdrawalQuote,
} from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { Wallet, WalletBankAccount, WithdrawalQuote } from "@/types/wallet";
import { formatVnd } from "@/utils/wallet-format";

const PRESETS = [100_000, 200_000, 500_000, 1_000_000];

export function WalletWithdrawScreen() {
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [accounts, setAccounts] = useState<WalletBankAccount[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [amountText, setAmountText] = useState("");
  const [quote, setQuote] = useState<WithdrawalQuote | null>(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef(createWithdrawalIdempotencyKey());
  const [bankForm, setBankForm] = useState({ bankCode: "", bankName: "", accountNumber: "", accountHolderName: "" });

  const amount = Number(amountText.replace(/\D/g, "")) || 0;
  const selected = accounts.find((item) => item.id === selectedId) ?? null;

  const load = useCallback(async () => {
    try {
      const [walletResult, accountResult] = await Promise.all([getWallet(), getWalletBankAccounts()]);
      setWallet(walletResult); setAccounts(accountResult);
      setSelectedId((current) => current || accountResult.find((item) => item.isDefault)?.id || accountResult[0]?.id || "");
      setShowBankForm(accountResult.length === 0);
    } catch (reason) { setError(messageOf(reason)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!amount) { setQuote(null); return; }
    const timer = setTimeout(() => void getWithdrawalQuote(amount).then(setQuote).catch(() => setQuote(null)), 250);
    return () => clearTimeout(timer);
  }, [amount]);

  const addBank = async () => {
    setError(null); setSubmitting(true);
    try {
      const account = await createWalletBankAccount({ ...bankForm, isDefault: accounts.length === 0 });
      setAccounts((current) => [account, ...current]); setSelectedId(account.id); setShowBankForm(false);
    } catch (reason) { setError(messageOf(reason)); } finally { setSubmitting(false); }
  };

  const submit = async () => {
    if (!quote || !selected || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const result = await createWalletWithdrawal(quote.amount, selected.id, requestKey.current);
      requestKey.current = createWithdrawalIdempotencyKey();
      setConfirming(false);
      router.replace(`/wallet/withdrawal/${result.id}` as Href);
    } catch (reason) { setError(messageOf(reason)); setConfirming(false); } finally { setSubmitting(false); }
  };

  const canContinue = Boolean(quote && selected && amount <= (wallet?.availableBalance ?? 0));
  return <SafeAreaView style={styles.screen}><ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]}>
    <WalletScreenHeader title="Rút tiền" />
    <View style={styles.balanceCard}><Text style={styles.muted}>Số dư có thể rút</Text><Text style={styles.balance}>{formatVnd(wallet?.availableBalance ?? 0)}</Text><Text style={styles.coinNote}>Số dư ANKT coin được quản lý riêng và không thể rút.</Text></View>
    <View><Text style={styles.sectionTitle}>Số tiền muốn rút</Text><View style={styles.amountInput}><TextInput accessibilityLabel="Số tiền muốn rút" keyboardType="number-pad" onChangeText={(value) => setAmountText(value.replace(/\D/g, ""))} placeholder="Tối thiểu 50.000" placeholderTextColor={theme.colors.placeholder} style={styles.input} value={amountText} /><Text style={styles.currency}>VND</Text><Pressable accessibilityLabel="Rút toàn bộ số dư" accessibilityRole="button" disabled={!wallet || wallet.availableBalance <= 0} onPress={() => wallet && setAmountText(String(wallet.availableBalance))} style={({ pressed }) => [styles.allButton, pressed && styles.allButtonPressed, (!wallet || wallet.availableBalance <= 0) && styles.disabled]}><Text style={styles.allButtonText}>Tất cả</Text></Pressable></View><View style={styles.presets}>{PRESETS.map((value) => <Pressable key={value} onPress={() => setAmountText(String(value))} style={[styles.preset, amount === value && styles.presetActive]}><Text style={[styles.presetText, amount === value && styles.presetTextActive]}>{formatVnd(value)}</Text></Pressable>)}</View></View>
    <View><View style={styles.sectionRow}><Text style={styles.sectionTitle}>Tài khoản nhận</Text><Pressable onPress={() => setShowBankForm((value) => !value)}><Text style={styles.link}>+ Thêm tài khoản</Text></Pressable></View>{accounts.map((account) => <Pressable key={account.id} onPress={() => setSelectedId(account.id)} style={[styles.bankCard, account.id === selectedId && styles.bankCardActive]}><View style={styles.bankIcon}><Ionicons color={theme.colors.primary} name="business-outline" size={20} /></View><View style={styles.bankCopy}><Text style={styles.bankName}>{account.bankName}</Text><Text style={styles.muted}>{account.accountNumberMasked} · {account.accountHolderName}</Text></View><Ionicons color={account.id === selectedId ? theme.colors.primary : theme.colors.textMuted} name={account.id === selectedId ? "radio-button-on" : "radio-button-off"} size={21} /></Pressable>)}</View>
    {showBankForm && <View style={styles.form}><Text style={styles.sectionTitle}>Thêm tài khoản ngân hàng</Text>{(["bankCode", "bankName", "accountNumber", "accountHolderName"] as const).map((field) => <TextInput key={field} autoCapitalize={field === "accountNumber" ? "none" : "characters"} keyboardType={field === "accountNumber" ? "number-pad" : "default"} onChangeText={(value) => setBankForm((current) => ({ ...current, [field]: value }))} placeholder={{ bankCode: "Mã ngân hàng (VD: VCB)", bankName: "Tên ngân hàng", accountNumber: "Số tài khoản", accountHolderName: "Tên chủ tài khoản" }[field]} placeholderTextColor={theme.colors.placeholder} style={styles.field} value={bankForm[field]} />)}<Pressable disabled={submitting} onPress={() => void addBank()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Lưu tài khoản</Text></Pressable></View>}
    {quote && <View style={styles.quote}><QuoteRow label="Số tiền rút" value={formatVnd(quote.amount)} styles={styles} /><QuoteRow label="Phí giao dịch" value={formatVnd(quote.fee)} styles={styles} /><QuoteRow emphasis label="Thực nhận" value={formatVnd(quote.netAmount)} styles={styles} /></View>}
    {amount > (wallet?.availableBalance ?? 0) && <Text style={styles.error}>Số dư khả dụng không đủ.</Text>}{error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Pressable disabled={!canContinue || submitting} onPress={() => setConfirming(true)} style={[styles.primaryButton, (!canContinue || submitting) && styles.disabled]}><Text style={styles.primaryButtonText}>Tiếp tục</Text></Pressable>
  </ScrollView><Modal animationType="slide" onRequestClose={() => setConfirming(false)} transparent visible={confirming}><Pressable onPress={() => !submitting && setConfirming(false)} style={styles.backdrop}><Pressable onPress={(event) => event.stopPropagation()} style={[styles.sheet, isDesktopWeb && styles.sheetDesktop]}><View style={styles.handle} /><Text style={styles.sheetTitle}>Xác nhận rút tiền</Text><Text style={styles.sheetBody}>Kiểm tra kỹ thông tin trước khi gửi yêu cầu. Yêu cầu đang xử lý không thể tự hủy.</Text>{quote && selected && <View style={styles.quote}><QuoteRow label="Ngân hàng" value={`${selected.bankName} ${selected.accountNumberMasked}`} styles={styles} /><QuoteRow label="Số tiền rút" value={formatVnd(quote.amount)} styles={styles} /><QuoteRow label="Phí" value={formatVnd(quote.fee)} styles={styles} /><QuoteRow emphasis label="Thực nhận" value={formatVnd(quote.netAmount)} styles={styles} /></View>}<Pressable disabled={submitting} onPress={() => void submit()} style={[styles.primaryButton, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color={theme.colors.primaryContrast} /> : <Text style={styles.primaryButtonText}>Xác nhận rút tiền</Text>}</Pressable></Pressable></Pressable></Modal></SafeAreaView>;
}

const messageOf = (reason: unknown) => reason instanceof Error ? reason.message : "Không thể xử lý yêu cầu.";
function QuoteRow({ emphasis, label, value, styles }: { emphasis?: boolean; label: string; value: string; styles: ReturnType<typeof createStyles> }) { return <View style={styles.quoteRow}><Text style={emphasis ? styles.quoteStrong : styles.muted}>{label}</Text><Text style={emphasis ? styles.quoteStrong : styles.quoteValue}>{value}</Text></View>; }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  allButton: { backgroundColor: colors.primarySoft, borderRadius: 12, marginLeft: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, allButtonPressed: { opacity: 0.7 }, allButtonText: { color: colors.primary, fontSize: 12, fontWeight: "900" }, amountInput: { alignItems: "center", borderBottomColor: colors.primary, borderBottomWidth: 2, flexDirection: "row" }, backdrop: { backgroundColor: colors.overlay, flex: 1, justifyContent: "flex-end" }, balance: { color: colors.text, fontSize: 26, fontWeight: "900", marginTop: 4 }, balanceCard: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 16, borderWidth: 1, padding: spacing.lg }, bankCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, padding: spacing.md }, bankCardActive: { borderColor: colors.primary, borderWidth: 1.5 }, bankCopy: { flex: 1 }, bankIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, bankName: { color: colors.text, fontSize: 14, fontWeight: "800" }, coinNote: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm }, content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48 }, currency: { color: colors.textMuted, fontWeight: "800" }, desktop: { alignSelf: "center", maxWidth: 620, width: "100%" }, disabled: { opacity: 0.45 }, error: { color: colors.danger, fontSize: 13 }, field: { backgroundColor: colors.input, borderColor: colors.borderSubtle, borderRadius: 12, borderWidth: 1, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 12 }, form: { backgroundColor: colors.surface, borderRadius: 16, gap: spacing.sm, padding: spacing.lg }, handle: { alignSelf: "center", backgroundColor: colors.border, borderRadius: 2, height: 4, marginBottom: spacing.lg, width: 40 }, input: { color: colors.text, flex: 1, fontSize: 28, fontWeight: "900", minWidth: 0, paddingVertical: spacing.md }, link: { color: colors.primary, fontSize: 13, fontWeight: "800" }, muted: { color: colors.textMuted, fontSize: 12 }, preset: { alignItems: "center", borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexBasis: "47%", flexGrow: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, presetActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, presets: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }, presetText: { color: colors.textMuted, fontWeight: "700" }, presetTextActive: { color: colors.primary }, primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 14, justifyContent: "center", minHeight: 50, padding: spacing.md }, primaryButtonText: { color: colors.primaryContrast, fontSize: 15, fontWeight: "900" }, quote: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 16, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, quoteRow: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }, quoteStrong: { color: colors.text, fontSize: 15, fontWeight: "900" }, quoteValue: { color: colors.text, fontSize: 13, fontWeight: "700", textAlign: "right" }, screen: { backgroundColor: colors.background, flex: 1 }, secondaryButton: { alignItems: "center", borderColor: colors.primary, borderRadius: 12, borderWidth: 1, padding: spacing.md }, secondaryButtonText: { color: colors.primary, fontWeight: "800" }, sectionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "900" }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: spacing.lg, padding: spacing.xl, paddingBottom: 36 }, sheetBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19 }, sheetDesktop: { alignSelf: "center", borderRadius: 24, marginBottom: 24, maxWidth: 560, width: "100%" }, sheetTitle: { color: colors.text, fontSize: 21, fontWeight: "900" },
});
