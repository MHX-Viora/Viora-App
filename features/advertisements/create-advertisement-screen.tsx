import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostCard } from "@/components/feed/post-card";
import { showAppToast } from "@/components/common/app-toast";
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
import { createPostAdvertisementPreview } from './post-advertisement-preview';
import { ReelAdvertisementPreview } from './reel-advertisement-preview';
import { AdvertisementStartCalendar } from './advertisement-start-calendar';
import { AdvertisementDurationSlider } from './advertisement-duration-slider';
import { addLocalDays, createAdvertisementSchedule, localDateKey, parseLocalDate } from './advertisement-schedule';

const BUDGETS = [50_000, 100_000, 200_000];
const OBJECTIVES = [
  { value: AdvertisementObjective.Awareness, label: "Tăng nhận biết", icon: "eye-outline" as const },
  { value: AdvertisementObjective.Traffic, label: "Tăng lượt truy cập", icon: "navigate-outline" as const },
  { value: AdvertisementObjective.Engagement, label: "Tăng tương tác", icon: "chatbubbles-outline" as const },
];
const INTERNAL_CTAS = [AdvertisementCtaType.LearnMore, AdvertisementCtaType.Message, AdvertisementCtaType.ContactNow, AdvertisementCtaType.Follow];
const EXTERNAL_CTAS = [AdvertisementCtaType.LearnMore, AdvertisementCtaType.BuyNow, AdvertisementCtaType.SignUp, AdvertisementCtaType.Download, AdvertisementCtaType.ViewProduct, AdvertisementCtaType.GetOffer];

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
  const submitInFlight = useRef(false);
  const [objective, setObjective] = useState(AdvertisementObjective.Awareness);
  const [ctaType, setCtaType] = useState(AdvertisementCtaType.LearnMore);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(50_000);
  const [startDate, setStartDate] = useState(() => localDateKey(new Date()));
  const [durationDays, setDurationDays] = useState(3);
  const [bodySize, setBodySize] = useState({ width: 0, height: 0 });
  const useSplitLayout = Boolean(post || reel) && bodySize.width >= 1000;
  const desktopPreviewWidth = Math.min(420, Math.max(1, (bodySize.height - spacing.lg * 4 - 40) * 9 / 16));

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
      if (mounted) showAppToast({ message: error instanceof Error ? error.message : "Không thể tải nội dung. Vui lòng thử lại.", type: "error" });
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [numericPostType, postId]);

  const dailyBudget = budget;
  const totalBudget = dailyBudget * durationDays;
  const insufficient = Number.isFinite(totalBudget) && balance < totalBudget;
  const today = localDateKey(new Date());
  const expectedStart = parseLocalDate(startDate)!;
  const expectedEnd = new Date(expectedStart.getTime() + durationDays * 86_400_000);

  const handleSubmit = async () => {
    if (submitInFlight.current) return;
    if (!Number.isFinite(totalBudget) || dailyBudget < 50_000 || totalBudget > 1_000_000_000) {
      showAppToast({ message: "Ngân sách ngày tối thiểu là 50.000đ và tổng ngân sách tối đa là 1 tỷ đồng.", type: "error" });
      return;
    }
    if (insufficient) return;
    let schedule: ReturnType<typeof createAdvertisementSchedule>;
    try {
      schedule = createAdvertisementSchedule(startDate, durationDays);
    } catch (error) {
      showAppToast({ message: error instanceof Error ? error.message : "Vui lòng chọn lại ngày bắt đầu.", type: "error" });
      return;
    }
    submitInFlight.current = true;
    setSubmitting(true);
    try {
      const { startAt, endAt } = schedule;
      const created = await createAdvertisement({
        postId,
        objective,
        destinationUrl: destinationUrl.trim() || undefined,
        headline: headline.trim() || undefined,
        description: description.trim() || undefined,
        ctaType,
        targetingMode: AdvertisementTargetingMode.Automatic,
        dailyBudget,
        totalBudget,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
      const submitted = await submitAdvertisement(created.id);
      router.replace({ pathname: "/advertisements/[id]", params: { id: submitted.id, submitted: "1" } });
    } catch (error) {
      if (error instanceof AdvertisementRequestError && error.code === "INSUFFICIENT_WALLET_BALANCE") {
        setBalance(error.details?.available ?? balance);
        showAppToast({ message: "Số dư Ví ANKT không đủ để chạy quảng cáo.", type: "error" });
      } else {
        showAppToast({ message: error instanceof Error ? error.message : "Không thể gửi quảng cáo. Vui lòng thử lại.", type: "error" });
      }
    } finally { submitInFlight.current = false; setSubmitting(false); }
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /></SafeAreaView>;

  const preview = (
    <Section title="Xem trước nội dung">
      {post ? <PostCard advertisementPreviewLayout post={createPostAdvertisementPreview(post, ctaType, destinationUrl, headline, description)} variant={numericPostType === 2 ? "news" : "default"} /> : null}
      {reel ? <ReelAdvertisementPreview ctaType={ctaType} reel={reel} /> : null}
    </Section>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Quay lại" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={styles.iconButton}><Ionicons color={theme.colors.text} name="arrow-back" size={22} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.title}>Tạo quảng cáo</Text><Text style={styles.subtitle}>Quảng bá tự nhiên, rõ ràng và đúng đối tượng</Text></View>
      </View>
      <View onLayout={({ nativeEvent: { layout } }) => setBodySize({ width: layout.width, height: layout.height })} style={[styles.body, useSplitLayout && styles.splitBody]}>
        {useSplitLayout ? (
          <View style={[styles.previewPane, post && styles.postPreviewPane]}>
            {post ? (
              <ScrollView showsVerticalScrollIndicator={false}>{preview}</ScrollView>
            ) : (
              <View style={{ alignSelf: "center", maxWidth: "100%", width: desktopPreviewWidth + spacing.lg * 2 + 2 }}>{preview}</View>
            )}
          </View>
        ) : null}
      <ScrollView style={styles.settingsScroll} contentContainerStyle={[styles.content, useSplitLayout && styles.desktopContent]} showsVerticalScrollIndicator={false}>
        {!useSplitLayout ? preview : null}

        {post ? <Section title="Nội dung dưới ảnh quảng cáo">
          <Text style={styles.helper}>Tự viết tiêu đề và mô tả cho khung bên dưới ảnh. Để trống mục nào thì mục đó không hiển thị.</Text>
          <Text style={styles.fieldLabel}>Tiêu đề quảng cáo</Text>
          <TextInput accessibilityLabel="Tiêu đề quảng cáo" maxLength={120} onChangeText={setHeadline} placeholder="VD: ANKT – Cộng đồng chia sẻ, kết nối mọi người" placeholderTextColor={theme.colors.placeholder} style={styles.input} value={headline} />
          <Text style={styles.helper}>{headline.length}/120 ký tự</Text>
          <Text style={styles.fieldLabel}>Mô tả ngắn</Text>
          <TextInput accessibilityLabel="Mô tả ngắn quảng cáo" maxLength={240} multiline numberOfLines={3} onChangeText={setDescription} placeholder="Giới thiệu ngắn về nội dung hoặc ưu đãi của bạn" placeholderTextColor={theme.colors.placeholder} style={[styles.input, { minHeight: 84, paddingVertical: spacing.sm, textAlignVertical: 'top' }]} value={description} />
          <Text style={styles.helper}>{description.length}/240 ký tự. Tên miền phía trên được lấy từ liên kết đích.</Text>
        </Section> : null}

        <Section title="Mục tiêu">
          <View style={styles.grid}>{OBJECTIVES.map((item) => <Choice key={item.value} active={objective === item.value} label={item.label} icon={item.icon} onPress={() => setObjective(item.value)} />)}</View>
        </Section>

        <Section title="Nút kêu gọi hành động">
          <TextInput autoCapitalize="none" keyboardType="url" onChangeText={(value) => { if (Boolean(value.trim()) !== Boolean(destinationUrl.trim())) setCtaType(AdvertisementCtaType.LearnMore); setDestinationUrl(value); }} placeholder="https://website-cua-ban.vn (không bắt buộc)" placeholderTextColor={theme.colors.placeholder} style={styles.input} value={destinationUrl} />
          <Text style={styles.helper}>Chỉ chấp nhận HTTPS. Để trống để mở nội dung, trò chuyện hoặc hồ sơ trong ANKT.</Text>
          <View style={styles.wrap}>{(destinationUrl.trim() ? EXTERNAL_CTAS : INTERNAL_CTAS).map((item) => <Chip key={item} active={ctaType === item} label={advertisementCtaLabel(item)} onPress={() => setCtaType(item)} />)}</View>
        </Section>

        <Section title="Ngân sách & thời gian">
          <View style={styles.wrap}>{BUDGETS.map((item) => <Chip key={item} active={budget === item} label={`${formatVnd(item)}/ngày`} onPress={() => setBudget(item)} />)}</View>
          <Text style={styles.fieldLabel}>Bắt đầu</Text>
          <View style={styles.wrap}>{[{ days: 0, label: "Hôm nay" }, { days: 1, label: "Ngày mai" }, { days: 3, label: "Sau 3 ngày" }].map((option) => <Chip key={option.days} active={startDate === addLocalDays(today, option.days)} label={option.label} onPress={() => setStartDate(addLocalDays(localDateKey(new Date()), option.days))} />)}</View>
          <AdvertisementStartCalendar onChange={setStartDate} value={startDate} />
          <Text style={styles.fieldLabel}>Thời gian chạy</Text>
          <AdvertisementDurationSlider onChange={setDurationDays} value={durationDays} />
          <Text style={styles.helper}>Dự kiến: {expectedStart.toLocaleDateString("vi-VN")} – {expectedEnd.toLocaleDateString("vi-VN")}</Text>
        </Section>

        <View style={styles.summary}>
          <View><Text style={styles.summaryLabel}>Số dư Ví ANKT</Text><Text style={styles.summaryValue}>{formatVnd(balance)}</Text><Text style={styles.summaryLabel}>Mỗi ngày: {formatVnd(Number.isFinite(dailyBudget) ? dailyBudget : 0)}</Text></View>
          <View style={styles.summaryRight}><Text style={styles.summaryLabel}>Tổng ngân sách · {durationDays} ngày</Text><Text style={styles.summaryBudget}>{formatVnd(Number.isFinite(totalBudget) ? totalBudget : 0)}</Text></View>
        </View>
        {insufficient ? <View accessibilityRole="alert" style={styles.insufficient}><Ionicons color={theme.colors.warning} name="wallet-outline" size={22} /><View style={styles.insufficientCopy}><Text style={styles.insufficientTitle}>Số dư của bạn không đủ để chạy quảng cáo.</Text><Text style={styles.helper}>Cần nạp thêm {formatVnd(Math.max(0, totalBudget - balance))}.</Text></View><Pressable onPress={() => router.push("/wallet/deposit")}><Text style={styles.deposit}>Nạp tiền</Text></Pressable></View> : null}
        <Pressable accessibilityRole="button" disabled={submitting || insufficient} onPress={() => void handleSubmit()} style={[styles.submit, (submitting || insufficient) && styles.disabled]}>{submitting ? <ActivityIndicator color={theme.colors.primaryContrast} /> : <Text style={styles.submitText}>{startDate > today ? 'Thanh toán & lên lịch' : 'Thanh toán & chạy'} · {formatVnd(Number.isFinite(totalBudget) ? totalBudget : 0)}</Text>}</Pressable>
        <Text style={styles.terms}>Ngân sách được tạm giữ trong Ví. Thanh toán thành công, quảng cáo tự chạy theo thời gian đã chọn, không cần chờ duyệt. Phần chưa sử dụng được hoàn khi hủy hoặc kết thúc.</Text>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { const { theme } = useTheme(); return <View style={[local.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[local.sectionTitle, { color: theme.colors.text }]}>{title}</Text>{children}</View>; }
function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { const { theme } = useTheme(); return <Pressable accessibilityRole="button" onPress={onPress} style={[local.chip, { backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceElevated, borderColor: active ? theme.colors.primary : theme.colors.border }]}><Text style={[local.chipText, { color: active ? theme.colors.primary : theme.colors.text }]}>{label}</Text></Pressable>; }
function Choice({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) { const { theme } = useTheme(); return <Pressable onPress={onPress} style={[local.choice, { backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceElevated, borderColor: active ? theme.colors.primary : theme.colors.border }]}><Ionicons color={active ? theme.colors.primary : theme.colors.icon} name={icon} size={22} /><Text style={[local.choiceText, { color: theme.colors.text }]}>{label}</Text>{active ? <Ionicons color={theme.colors.primary} name="checkmark-circle" size={18} /> : null}</Pressable>; }

const local = StyleSheet.create({ section: { borderRadius: 16, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, sectionTitle: { fontSize: 17, fontWeight: "800" }, chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipText: { fontSize: 13, fontWeight: "700" }, choice: { alignItems: "center", borderRadius: 14, borderWidth: 1, flex: 1, gap: spacing.sm, minHeight: 104, padding: spacing.md }, choiceText: { fontSize: 12, fontWeight: "700", textAlign: "center" } });
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  body: { flex: 1, minHeight: 0 },
  splitBody: { alignSelf: "center", flexDirection: "row", maxWidth: 1280, width: "100%" },
  previewPane: { padding: spacing.lg, width: "44%" },
  postPreviewPane: { width: "52%" },
  settingsScroll: { flex: 1, minHeight: 0, minWidth: 0 },
  desktopContent: { maxWidth: "100%" },
  ageInput: { flex: 1 }, ageRow: { flexDirection: "row", gap: spacing.sm }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" }, content: { alignSelf: "center", gap: spacing.md, maxWidth: 720, padding: spacing.lg, paddingBottom: 48, width: "100%" }, deposit: { color: colors.primary, fontWeight: "800" }, disabled: { opacity: 0.48 }, fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "700" }, grid: { flexDirection: "row", gap: spacing.sm }, header: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md }, headerCopy: { flex: 1 }, helper: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, iconButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 }, input: { backgroundColor: colors.input, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: spacing.md }, insufficient: { alignItems: "center", backgroundColor: colors.warningSoft, borderRadius: 14, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, insufficientCopy: { flex: 1 }, insufficientTitle: { color: colors.text, fontSize: 13, fontWeight: "800" }, screen: { backgroundColor: colors.background, flex: 1 }, segment: { flexDirection: "row", gap: spacing.sm }, submit: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 14, minHeight: 52, justifyContent: "center", paddingHorizontal: spacing.lg }, submitText: { color: colors.primaryContrast, fontSize: 15, fontWeight: "900" }, subtitle: { color: colors.textMuted, fontSize: 12 }, summary: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: spacing.lg }, summaryBudget: { color: colors.primary, fontSize: 18, fontWeight: "900" }, summaryLabel: { color: colors.textMuted, fontSize: 12 }, summaryRight: { alignItems: "flex-end" }, summaryValue: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 2 }, terms: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: "center" }, title: { color: colors.text, fontSize: 20, fontWeight: "900" }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
