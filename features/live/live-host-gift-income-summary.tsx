import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getLiveGiftIncome, type LiveGiftIncome } from "@/services/live.service";
import { formatVnd } from "@/utils/wallet-format";
import { fetchHostGiftIncome } from "./live-host-gift-income-summary-model";
import { HostButton, hostColors } from "./live-host-ui";

export function LiveHostGiftIncomeSummary({ liveId }: { liveId: string }) {
  const [income, setIncome] = useState<LiveGiftIncome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setIncome(null);
    void fetchHostGiftIncome(liveId, getLiveGiftIncome)
      .then((result) => { if (active) setIncome(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [liveId, retry]);

  return <View style={styles.panel}>
    <View style={styles.heading}><Ionicons name="gift-outline" color={hostColors.cyan} size={22} /><Text style={styles.label}>Tổng tiền quà nhận được</Text></View>
    {loading ? <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator color={hostColors.cyan} /><Text style={styles.detail}>Đang tải tổng tiền quà…</Text></View> : null}
    {!loading && income ? <>
      <Text accessibilityLiveRegion="polite" style={styles.amount}>{formatVnd(income.netAmount)}</Text>
      <Text style={styles.detail}>{income.totalGiftCount.toLocaleString("vi-VN")} quà · {income.senderCount.toLocaleString("vi-VN")} người tặng</Text>
      <Text style={styles.detail}>{income.netAmount > 0 ? "Tiền quà đã được cộng vào ví VNĐ của bạn." : "Buổi Live này chưa nhận được quà."}</Text>
    </> : null}
    {!loading && error ? <View accessibilityLiveRegion="polite" style={styles.loading}><Text style={styles.detail}>Chưa tải được tổng tiền quà. Bạn vẫn có thể xem giao dịch trong ví.</Text><HostButton label="Thử lại" variant="secondary" onPress={() => setRetry((value) => value + 1)} /></View> : null}
    <HostButton label="Xem ví" onPress={() => router.replace("/wallet")} style={styles.walletButton} />
  </View>;
}

const styles = StyleSheet.create({
  panel: { alignSelf: "stretch", backgroundColor: hostColors.surfaceRaised, borderColor: hostColors.border, borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 20 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { color: hostColors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  amount: { color: hostColors.cyan, fontSize: 30, fontWeight: "800", marginTop: 12 },
  detail: { color: hostColors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  loading: { gap: 8, marginTop: 12 },
  walletButton: { marginTop: 16 },
});
