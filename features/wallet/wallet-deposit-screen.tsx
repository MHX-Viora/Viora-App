import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { WalletScreenHeader } from "@/components/wallet/wallet-screen-header";
import { useResponsive } from "@/hooks/use-responsive";
import { createWalletDeposit, getWalletPayment, invalidateWalletData } from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { WalletPayment } from "@/types/wallet";
import { formatVnd } from "@/utils/wallet-format";
import { formatWalletPaymentTimeRemaining, resolveWalletPaymentQrValue } from "@/utils/wallet-payment";

const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000] as const;
const ACTIVE_PAYMENT_KEY = "wallet:active-deposit-payment";

export function WalletDepositScreen() {
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [amount, setAmount] = useState(500_000);
  const [custom, setCustom] = useState("");
  const [payment, setPayment] = useState<WalletPayment | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const refreshedPaymentRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(ACTIVE_PAYMENT_KEY)
      .then((paymentId) => paymentId ? getWalletPayment(paymentId) : null)
      .then((restored) => { if (active && restored) setPayment(restored); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const checkPayment = useCallback(async () => {
    if (!payment?.id || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const next = await getWalletPayment(payment.id);
      setPayment((current) => current?.id === next.id ? next : current);
      if (next.status !== 0) await AsyncStorage.removeItem(ACTIVE_PAYMENT_KEY);
      if (next.status === 1 && refreshedPaymentRef.current !== next.id) {
        refreshedPaymentRef.current = next.id;
        invalidateWalletData();
      }
    } catch {
      // A temporary network error must not change the payment state.
    } finally {
      checkingRef.current = false;
    }
  }, [payment?.id]);

  useEffect(() => {
    if (!payment || payment.status !== 0) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    const start = () => { if (!timer) timer = setInterval(() => void checkPayment(), 5000); };
    if (AppState.currentState === "active") start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") { void checkPayment(); start(); }
      else stop();
    });
    return () => { stop(); subscription.remove(); };
  }, [checkPayment, payment]);

  useEffect(() => {
    if (!payment || payment.status !== 0) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [payment]);

  const selectedAmount = custom ? Number(custom.replace(/\D/g, "")) : amount;
  const createPayment = async () => {
    setSubmitting(true); setError(null);
    try {
      const created = await createWalletDeposit(selectedAmount);
      await AsyncStorage.setItem(ACTIVE_PAYMENT_KEY, created.id);
      setPayment(created);
    }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Không thể tạo thanh toán."); }
    finally { setSubmitting(false); }
  };

  if (payment) {
    const paid = payment.status === 1;
    const terminal = payment.status !== 0;
    const qrValue = resolveWalletPaymentQrValue(payment);
    const qrUnavailable = !terminal && !qrValue;
    const statusTitle = payment.status === 1 ? "Nạp tiền thành công!" : payment.status === 2 ? "Thanh toán thất bại" : payment.status === 3 ? "Thanh toán đã hủy" : payment.status === 4 ? "Mã QR đã hết hạn" : qrUnavailable ? "Chưa thể tạo mã QR" : "Quét mã để thanh toán";
    const paymentHint = paid
      ? "Số tiền đã được xác nhận và cộng vào Ví ANKT."
      : terminal
        ? "Tiền chưa được cộng vào Ví ANKT."
        : qrUnavailable
          ? "Dữ liệu thanh toán chưa sẵn sàng. Vui lòng hủy và tạo lại giao dịch."
          : null;
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]}>
          <WalletScreenHeader title="Thanh toán" />
          <View style={styles.provider}><Text style={styles.timerLabel}>Thanh toán trong vòng</Text><Text accessibilityLabel={`Thời gian thanh toán còn lại ${formatWalletPaymentTimeRemaining(payment.expiresAt, nowMs)}`} style={styles.countdown}>{formatWalletPaymentTimeRemaining(payment.expiresAt, nowMs)}</Text><Text style={styles.providerMeta}>Mã giao dịch {payment.providerOrderCode}</Text></View>
          <View style={styles.paymentCard}>
            {paid ? <Ionicons color={theme.colors.success} name="checkmark-circle" size={62} /> : terminal ? <Ionicons color={theme.colors.danger} name="close-circle" size={62} /> : qrValue ? <View style={styles.qr}><QRCode backgroundColor={theme.colors.qrBackground} color={theme.colors.qrForeground} size={220} value={qrValue} /></View> : <Ionicons color={theme.colors.warning} name="alert-circle-outline" size={58} />}
            <Text style={styles.paymentTitle}>{statusTitle}</Text>
            <Text style={styles.paymentAmount}>{formatVnd(payment.amount)}</Text>
            {!terminal && <Text style={styles.paymentHint}>Nội dung chuyển khoản: {payment.transferContent}</Text>}
            {paymentHint && <Text style={styles.paymentHint}>{paymentHint}</Text>}
          </View>
          {!terminal && payment.checkoutUrl && <Pressable onPress={() => void Linking.openURL(payment.checkoutUrl!)} style={styles.primaryButton}><Text style={styles.primaryText}>Mở trang dự phòng</Text></Pressable>}
          <Pressable onPress={() => paid ? router.replace("/wallet" as Href) : void AsyncStorage.removeItem(ACTIVE_PAYMENT_KEY).finally(() => setPayment(null))} style={styles.secondaryButton}><Text style={styles.secondaryText}>{paid ? "Về Ví ANKT" : terminal ? "Tạo giao dịch mới" : "Hủy thanh toán"}</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]} keyboardShouldPersistTaps="handled">
        <WalletScreenHeader title="Nạp tiền" />
        <Text style={styles.sectionLabel}>Chọn số tiền</Text>
        <View style={styles.presets}>{PRESETS.map((value) => <Pressable key={value} onPress={() => { setAmount(value); setCustom(""); }} style={[styles.preset, !custom && amount === value && styles.presetActive]}><Text style={[styles.presetText, !custom && amount === value && styles.presetTextActive]}>{formatVnd(value)}</Text></Pressable>)}</View>
        <TextInput accessibilityLabel="Nhập số tiền khác" inputMode="numeric" onChangeText={setCustom} placeholder="Số tiền khác" placeholderTextColor={theme.colors.placeholder} style={styles.input} value={custom} />
        <View accessibilityLabel="Phương thức thanh toán: Quét mã QR" style={styles.paymentMethod}>
          <View style={styles.paymentMethodIcon}><Ionicons color={theme.colors.primary} name="qr-code-outline" size={22} /></View>
          <View style={styles.paymentMethodCopy}><Text style={styles.paymentMethodLabel}>Phương thức thanh toán</Text><Text style={styles.paymentMethodValue}>Quét mã QR</Text></View>
          <Ionicons color={theme.colors.success} name="checkmark-circle" size={22} />
        </View>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable disabled={submitting || selectedAmount <= 0} onPress={() => void createPayment()} style={({ pressed }) => [styles.primaryButton, (pressed || submitting) && styles.buttonPressed]}><Text style={styles.primaryText}>{submitting ? "Đang tạo thanh toán…" : "Tiếp tục thanh toán"}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  buttonPressed: { opacity: 0.65 }, content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48 }, desktop: { alignSelf: "center", maxWidth: 620, width: "100%" },
  error: { color: colors.danger, fontSize: 13 }, input: { backgroundColor: colors.input, borderColor: colors.borderSubtle, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 17, fontWeight: "700", minHeight: 52, paddingHorizontal: spacing.lg },
  countdown: { color: colors.primary, fontSize: 20, fontVariant: ["tabular-nums"], fontWeight: "900" }, paymentAmount: { color: colors.text, fontSize: 30, fontWeight: "900" }, paymentCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 20, borderWidth: 1, gap: spacing.md, padding: spacing.xl }, paymentHint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, maxWidth: 360, textAlign: "center" }, paymentTitle: { color: colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" },
  paymentMethod: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 68, paddingHorizontal: spacing.lg }, paymentMethodCopy: { flex: 1, gap: 3 }, paymentMethodIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 12, height: 42, justifyContent: "center", width: 42 }, paymentMethodLabel: { color: colors.textMuted, fontSize: 12 }, paymentMethodValue: { color: colors.text, fontSize: 15, fontWeight: "800" },
  preset: { alignItems: "center", borderColor: colors.borderSubtle, borderRadius: 13, borderWidth: 1, minHeight: 48, justifyContent: "center", width: "31%" }, presetActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, presetText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" }, presetTextActive: { color: colors.primary }, presets: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 14, minHeight: 52, justifyContent: "center", paddingHorizontal: spacing.lg }, primaryText: { color: colors.primaryContrast, fontSize: 15, fontWeight: "900" }, provider: { alignItems: "center" }, providerMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, qr: { backgroundColor: colors.qrBackground, borderRadius: 16, padding: spacing.lg }, timerLabel: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  screen: { backgroundColor: colors.background, flex: 1 }, secondaryButton: { alignItems: "center", borderColor: colors.border, borderRadius: 14, borderWidth: 1, minHeight: 50, justifyContent: "center" }, secondaryText: { color: colors.text, fontSize: 14, fontWeight: "800" }, sectionLabel: { color: colors.text, fontSize: 16, fontWeight: "800" },
});
