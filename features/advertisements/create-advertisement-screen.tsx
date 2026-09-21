import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostCard } from "@/components/feed/post-card";
import { getPostById } from "@/services/feed.service";
import { getReelById } from "@/services/reel.service";
import { AdvertisementRequestError, createAdvertisement, submitAdvertisement } from "@/services/advertisement.service";
import { getWallet } from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import { AdvertisementCtaType, AdvertisementObjective, AdvertisementTargetingMode } from "@/types/advertisement";
import type { FeedPost } from "@/types/feed";
import type { Reel } from "@/types/reel";
import { formatVnd } from "@/utils/wallet-format";
import { advertisementCtaLabel } from "@/utils/advertisement-format";

const BUDGETS = [50_000, 100_000, 200_000];
const OBJECTIVES = [
  { value: AdvertisementObjective.Awareness, label: "Tăng nhận biết", icon: "eye-outline" as const },
  { value: AdvertisementObjective.Traffic, label: "Tăng lượt truy cập", icon: "navigate-outline" as const },
  { value: AdvertisementObjective.Engagement, label: "Tăng tương tác", icon: "chatbubbles-outline" as const },
];
const CTAS = [AdvertisementCtaType.LearnMore, AdvertisementCtaType.BuyNow, AdvertisementCtaType.Message, AdvertisementCtaType.SignUp];

export function CreateAdvertisementScreen() {
  const { postId, postType } = useLocalSearchParams<{ postId: string; postType?: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const numericPostType = Number(postType ?? 0);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [reel, setReel] = useState<Reel | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [objective, setObjective] = useState(AdvertisementObjective.Awareness);
  const [ctaType, setCtaType] = useState(AdvertisementCtaType.LearnMore);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [targetingMode, setTargetingMode] = useState(AdvertisementTargetingMode.Automatic);
  const [minimumAge, setMinimumAge] = useState("18");
  const [maximumAge, setMaximumAge] = useState("55");
  const [targetLocation, setTargetLocation] = useState("");
  const [budget, setBudget] = useState(50_000);
  const [customBudget, setCustomBudget] = useState("");
  const [durationDays, setDurationDays] = useState(3);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      getWallet(),
      numericPostType === 1 ? getReelById(postId) : getPostById(postId),
    ]).then(([wallet, content]) => {
      if (!mounted) return;
      setBalance(wallet.availableBalance);
      if (numericPostType === 1) setReel(content as Reel);
      else setPost(content as FeedPost);
    }).catch((error) => {
      if (mounted) Alert.alert("Không thể tạo quảng cáo", error instanceof Error ? error.message : "Vui lòng thử lại.");
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [numericPostType, postId]);

  const resolvedBudget = customBudget.trim() ? Number(customBudget.replace(/\D/g, "")) : budget;
  const insufficient = Number.isFinite(resolvedBudget) && balance < resolvedBudget;

  const handleSubmit = async () => {
    if (!Number.isFinite(resolvedBudget) || resolvedBudget < 50_000) {
      Alert.alert("Ngân sách chưa hợp lệ", "Ngân sách tối thiểu là 50.000đ.");
      return;
    }
    if (insufficient) return;
    setSubmitting(true);
    try {
      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + durationDays * 86_400_000);
      const created = await createAdvertisement({
        postId,
        objective,
        destinationUrl: destinationUrl.trim() || undefined,
        ctaType,
        targetingMode,
        minimumAge: targetingMode === AdvertisementTargetingMode.Custom ? Number(minimumAge) : undefined,
        maximumAge: targetingMode === AdvertisementTargetingMode.Custom ? Number(maximumAge) : undefined,
        targetLocation: targetingMode === AdvertisementTargetingMode.Custom ? targetLocation.trim() || undefined : undefined,
        totalBudget: resolvedBudget,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
      const submitted = await submitAdvertisement(created.id);
      router.replace({ pathname: "/advertisements/[id]", params: { id: submitted.id } });
    } catch (error) {
      if (error instanceof AdvertisementRequestError && error.code === "INSUFFICIENT_WALLET_BALANCE") {
        setBalance(error.details?.available ?? balance);
        Alert.alert("Số dư không đủ", "Số dư của bạn không đủ để chạy quảng cáo.", [
          { text: "Để sau", style: "cancel" },
          { text: "Nạp tiền", onPress: () => router.push("/wallet/deposit") },
        ]);
      } else {
        Alert.alert("Không thể gửi quảng cáo", error instanceof Error ? error.message : "Vui lòng thử lại.");
      }
    } finally { setSubmitting(false); }
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.iconButton}><Ionicons color={theme.colors.text} name="arrow-back" size={22} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.title}>Tạo quảng cáo</Text><Text style={styles.subtitle}>Quảng bá tự nhiên, rõ ràng và đúng đối tượng</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="Xem trước nội dung">
          {post ? <View style={styles.preview}><View style={styles.sponsored}><Ionicons color={theme.colors.primary} name="megaphone-outline" size={14} /><Text style={styles.sponsoredText}>Được tài trợ</Text></View><PostCard post={post} variant={numericPostType === 2 ? "news" : "default"} /></View> : null}
          {reel ? <View style={styles.reelPreview}><Image contentFit="cover" source={{ uri: reel.thumbnailUrl }} style={StyleSheet.absoluteFill} /><View style={styles.reelShade} /><View style={styles.reelCopy}><Text style={styles.reelAuthor}>{reel.author}</Text><Text numberOfLines={2} style={styles.reelCaption}>{reel.caption}</Text><Text style={styles.reelSponsored}>Được tài trợ</Text><View style={styles.previewCta}><Text style={styles.previewCtaText}>{advertisementCtaLabel(ctaType)}</Text></View></View></View> : null}
        </Section>

        <Section title="Mục tiêu">
          <View style={styles.grid}>{OBJECTIVES.map((item) => <Choice key={item.value} active={objective === item.value} label={item.label} icon={item.icon} onPress={() => setObjective(item.value)} />)}</View>
        </Section>

        <Section title="Nút kêu gọi hành động">
          <View style={styles.wrap}>{CTAS.map((item) => <Chip key={item} active={ctaType === item} label={advertisementCtaLabel(item)} onPress={() => setCtaType(item)} />)}</View>
          <TextInput autoCapitalize="none" keyboardType="url" onChangeText={setDestinationUrl} placeholder="https://website-cua-ban.vn (không bắt buộc)" placeholderTextColor={theme.colors.placeholder} style={styles.input} value={destinationUrl} />
          <Text style={styles.helper}>Chỉ chấp nhận liên kết HTTPS. Để trống sẽ mở nội dung trong ANKT.</Text>
        </Section>

        <Section title="Đối tượng">
          <View style={styles.segment}><Chip active={targetingMode === AdvertisementTargetingMode.Automatic} label="Tự động" onPress={() => setTargetingMode(AdvertisementTargetingMode.Automatic)} /><Chip active={targetingMode === AdvertisementTargetingMode.Custom} label="Tùy chỉnh" onPress={() => setTargetingMode(AdvertisementTargetingMode.Custom)} /></View>
          {targetingMode === AdvertisementTargetingMode.Custom ? <><View style={styles.ageRow}><TextInput keyboardType="number-pad" onChangeText={setMinimumAge} placeholder="Tuổi từ" placeholderTextColor={theme.colors.placeholder} style={[styles.input, styles.ageInput]} value={minimumAge} /><TextInput keyboardType="number-pad" onChangeText={setMaximumAge} placeholder="Đến" placeholderTextColor={theme.colors.placeholder} style={[styles.input, styles.ageInput]} value={maximumAge} /></View><TextInput onChangeText={setTargetLocation} placeholder="Khu vực (không bắt buộc)" placeholderTextColor={theme.colors.placeholder} style={styles.input} value={targetLocation} /></> : <Text style={styles.helper}>ANKT tự tối ưu phân phối cho người có khả năng quan tâm.</Text>}
        </Section>

        <Section title="Ngân sách & thời gian">
          <View style={styles.wrap}>{BUDGETS.map((item) => <Chip key={item} active={!customBudget && budget === item} label={formatVnd(item)} onPress={() => { setBudget(item); setCustomBudget(""); }} />)}</View>
          <TextInput keyboardType="number-pad" onChangeText={setCustomBudget} placeholder="Ngân sách khác (tối thiểu 50.000đ)" placeholderTextColor={theme.colors.placeholder} style={styles.input} value={customBudget} />
          <Text style={styles.fieldLabel}>Thời gian chạy</Text>
          <View style={styles.wrap}>{[1, 3, 7].map((days) => <Chip key={days} active={durationDays === days} label={`${days} ngày`} onPress={() => setDurationDays(days)} />)}</View>
        </Section>

        <View style={styles.summary}>
          <View><Text style={styles.summaryLabel}>Số dư Ví ANKT</Text><Text style={styles.summaryValue}>{formatVnd(balance)}</Text></View>
          <View style={styles.summaryRight}><Text style={styles.summaryLabel}>Tổng ngân sách</Text><Text style={styles.summaryBudget}>{formatVnd(Number.isFinite(resolvedBudget) ? resolvedBudget : 0)}</Text></View>
        </View>
        {insufficient ? <View accessibilityRole="alert" style={styles.insufficient}><Ionicons color={theme.colors.warning} name="wallet-outline" size={22} /><View style={styles.insufficientCopy}><Text style={styles.insufficientTitle}>Số dư của bạn không đủ để chạy quảng cáo.</Text><Text style={styles.helper}>Cần nạp thêm {formatVnd(Math.max(0, resolvedBudget - balance))}.</Text></View><Pressable onPress={() => router.push("/wallet/deposit")}><Text style={styles.deposit}>Nạp tiền</Text></Pressable></View> : null}
        <Pressable accessibilityRole="button" disabled={submitting || insufficient} onPress={() => void handleSubmit()} style={[styles.submit, (submitting || insufficient) && styles.disabled]}>{submitting ? <ActivityIndicator color={theme.colors.primaryContrast} /> : <Text style={styles.submitText}>Gửi xét duyệt · {formatVnd(Number.isFinite(resolvedBudget) ? resolvedBudget : 0)}</Text>}</Pressable>
        <Text style={styles.terms}>Ngân sách sẽ được tạm giữ trong Ví. Phần chưa sử dụng được hoàn khi quảng cáo bị từ chối, hủy hoặc kết thúc.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { const { theme } = useTheme(); return <View style={[local.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[local.sectionTitle, { color: theme.colors.text }]}>{title}</Text>{children}</View>; }
function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { const { theme } = useTheme(); return <Pressable accessibilityRole="button" onPress={onPress} style={[local.chip, { backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceElevated, borderColor: active ? theme.colors.primary : theme.colors.border }]}><Text style={[local.chipText, { color: active ? theme.colors.primary : theme.colors.text }]}>{label}</Text></Pressable>; }
function Choice({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) { const { theme } = useTheme(); return <Pressable onPress={onPress} style={[local.choice, { backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceElevated, borderColor: active ? theme.colors.primary : theme.colors.border }]}><Ionicons color={active ? theme.colors.primary : theme.colors.icon} name={icon} size={22} /><Text style={[local.choiceText, { color: theme.colors.text }]}>{label}</Text>{active ? <Ionicons color={theme.colors.primary} name="checkmark-circle" size={18} /> : null}</Pressable>; }

const local = StyleSheet.create({ section: { borderRadius: 16, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, sectionTitle: { fontSize: 17, fontWeight: "800" }, chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipText: { fontSize: 13, fontWeight: "700" }, choice: { alignItems: "center", borderRadius: 14, borderWidth: 1, flex: 1, gap: spacing.sm, minHeight: 104, padding: spacing.md }, choiceText: { fontSize: 12, fontWeight: "700", textAlign: "center" } });
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  ageInput: { flex: 1 }, ageRow: { flexDirection: "row", gap: spacing.sm }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" }, content: { alignSelf: "center", gap: spacing.md, maxWidth: 720, padding: spacing.lg, paddingBottom: 48, width: "100%" }, deposit: { color: colors.primary, fontWeight: "800" }, disabled: { opacity: 0.48 }, fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "700" }, grid: { flexDirection: "row", gap: spacing.sm }, header: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md }, headerCopy: { flex: 1 }, helper: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, iconButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 }, input: { backgroundColor: colors.input, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: spacing.md }, insufficient: { alignItems: "center", backgroundColor: colors.warningSoft, borderRadius: 14, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, insufficientCopy: { flex: 1 }, insufficientTitle: { color: colors.text, fontSize: 13, fontWeight: "800" }, preview: { borderColor: colors.border, borderRadius: 14, borderWidth: 1, overflow: "hidden" }, previewCta: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, marginTop: spacing.sm, padding: spacing.sm }, previewCtaText: { color: colors.primaryContrast, fontWeight: "800" }, reelAuthor: { color: colors.white, fontSize: 16, fontWeight: "800" }, reelCaption: { color: colors.white, lineHeight: 20 }, reelCopy: { bottom: spacing.lg, left: spacing.lg, position: "absolute", right: spacing.lg }, reelPreview: { aspectRatio: 0.75, backgroundColor: colors.reelBackground, borderRadius: 14, overflow: "hidden" }, reelShade: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay }, reelSponsored: { color: colors.white, fontSize: 12, marginTop: 3 }, screen: { backgroundColor: colors.background, flex: 1 }, segment: { flexDirection: "row", gap: spacing.sm }, sponsored: { alignItems: "center", backgroundColor: colors.primarySoft, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, sponsoredText: { color: colors.primary, fontSize: 12, fontWeight: "800" }, submit: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 14, minHeight: 52, justifyContent: "center", paddingHorizontal: spacing.lg }, submitText: { color: colors.primaryContrast, fontSize: 15, fontWeight: "900" }, subtitle: { color: colors.textMuted, fontSize: 12 }, summary: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: spacing.lg }, summaryBudget: { color: colors.primary, fontSize: 18, fontWeight: "900" }, summaryLabel: { color: colors.textMuted, fontSize: 12 }, summaryRight: { alignItems: "flex-end" }, summaryValue: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 2 }, terms: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: "center" }, title: { color: colors.text, fontSize: 20, fontWeight: "900" }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
