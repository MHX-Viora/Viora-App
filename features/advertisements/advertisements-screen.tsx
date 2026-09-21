import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getMyAdvertisements } from "@/services/advertisement.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { Advertisement } from "@/types/advertisement";
import { advertisementStatusLabel } from "@/utils/advertisement-format";
import { formatVnd } from "@/utils/wallet-format";

export function AdvertisementsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [items, setItems] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setItems((await getMyAdvertisements()).items); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Không thể tải quảng cáo."); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Pressable accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.icon}><Ionicons color={theme.colors.text} name="arrow-back" size={22} /></Pressable><View><Text style={styles.title}>Quảng cáo của tôi</Text><Text style={styles.subtitle}>Theo dõi ngân sách và hiệu quả thực tế</Text></View></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View> : error ? <View style={styles.center}><Ionicons color={theme.colors.warning} name="cloud-offline-outline" size={36} /><Text style={styles.emptyTitle}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Thử lại</Text></Pressable></View> :
      <FlatList contentContainerStyle={[styles.list, items.length === 0 && styles.emptyList]} data={items} keyExtractor={(item) => item.id} ListEmptyComponent={<View style={styles.center}><View style={styles.emptyIcon}><Ionicons color={theme.colors.primary} name="megaphone-outline" size={32} /></View><Text style={styles.emptyTitle}>Chưa có quảng cáo</Text><Text style={styles.emptyText}>Mở menu trên nội dung của bạn để bắt đầu quảng bá.</Text></View>} renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/advertisements/[id]", params: { id: item.id } })} style={styles.card}><View style={styles.cardTop}><View style={styles.cardCopy}><Text numberOfLines={2} style={styles.cardTitle}>{item.content.article?.title || item.content.content || "Nội dung quảng cáo"}</Text><Text style={styles.meta}>{advertisementStatusLabel(item.status)} · {new Date(item.startAt).toLocaleDateString("vi-VN")}–{new Date(item.endAt).toLocaleDateString("vi-VN")}</Text></View><Ionicons color={theme.colors.textMuted} name="chevron-forward" size={20} /></View><View style={styles.metrics}><Metric label="Đã chi" value={formatVnd(item.spentAmount)} /><Metric label="Hiển thị" value={String(item.impressions)} /><Metric label="Lượt nhấp" value={String(item.clicks)} /><Metric label="CTR" value={`${item.clickThroughRate}%`} /></View><View style={styles.progressTrack}><View style={[styles.progress, { width: `${Math.min(100, item.totalBudget ? item.spentAmount * 100 / item.totalBudget : 0)}%` }]} /></View><Text style={styles.budget}>{formatVnd(item.spentAmount)} / {formatVnd(item.totalBudget)}</Text></Pressable>} />}
  </SafeAreaView>;
}

function Metric({ label, value }: { label: string; value: string }) { const { theme } = useTheme(); return <View><Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: "800" }}>{value}</Text><Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>{label}</Text></View>; }
const createStyles = (colors: ThemeColors) => StyleSheet.create({ budget: { color: colors.textMuted, fontSize: 11, textAlign: "right" }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, cardCopy: { flex: 1 }, cardTitle: { color: colors.text, fontSize: 15, fontWeight: "800", lineHeight: 21 }, cardTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, center: { alignItems: "center", flex: 1, gap: spacing.sm, justifyContent: "center", padding: spacing.xl }, emptyIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 28, height: 56, justifyContent: "center", width: 56 }, emptyList: { flexGrow: 1 }, emptyText: { color: colors.textMuted, maxWidth: 280, textAlign: "center" }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800", textAlign: "center" }, header: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md }, icon: { alignItems: "center", height: 40, justifyContent: "center", width: 40 }, list: { alignSelf: "center", gap: spacing.md, maxWidth: 720, padding: spacing.lg, width: "100%" }, meta: { color: colors.textMuted, fontSize: 11, marginTop: 4 }, metrics: { flexDirection: "row", justifyContent: "space-between" }, progress: { backgroundColor: colors.primary, borderRadius: 3, height: 5 }, progressTrack: { backgroundColor: colors.primarySoft, borderRadius: 3, height: 5, overflow: "hidden" }, retry: { color: colors.primary, fontWeight: "800" }, screen: { backgroundColor: colors.background, flex: 1 }, subtitle: { color: colors.textMuted, fontSize: 12 }, title: { color: colors.text, fontSize: 20, fontWeight: "900" } });
