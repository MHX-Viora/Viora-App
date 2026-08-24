import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { AppShowcase } from "@/components/landing/app-showcase";
import { spacing, type ThemeColors, useTheme } from "@/theme";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.ankt.app";

const benefits = [
  { icon: "chatbubbles-outline" as const, title: "Trò chuyện tức thời", text: "Kết nối riêng tư với bạn bè và cộng đồng của bạn." },
  { icon: "play-circle-outline" as const, title: "Khoảnh khắc sống động", text: "Khám phá reels, bài viết và những câu chuyện mới mỗi ngày." },
  { icon: "shield-checkmark-outline" as const, title: "Cộng đồng tin cậy", text: "Không gian giao tiếp rõ ràng, gần gũi và an toàn hơn." },
];

export function AppIntroductionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const openGooglePlay = () => void Linking.openURL(GOOGLE_PLAY_URL);

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.glowTop} />
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image
            accessibilityLabel="Logo ANKT"
            contentFit="cover"
            source={require("../../assets/images/viora_logo.png")}
            style={styles.logo}
          />
          <Text style={styles.brandName}>ANKT</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/login")}
            style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
          >
            <Text style={styles.loginText}>Đăng nhập</Text>
          </Pressable>
          {!compact ? (
            <Pressable
              accessibilityLabel="Tải ANKT trên Google Play"
              accessibilityRole="link"
              onPress={openGooglePlay}
              style={({ pressed }) => [styles.headerDownload, pressed && styles.pressed]}
            >
              <Ionicons color={theme.colors.primaryContrast} name="logo-google-playstore" size={17} />
              <Text style={styles.headerDownloadText}>Tải ứng dụng</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
          <View style={styles.kicker}>
            <View style={styles.kickerDot} />
            <Text style={styles.kickerText}>MẠNG XÃ HỘI ANKT</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
            Kết nối thật.{"\n"}<Text style={styles.titleAccent}>Chia sẻ theo cách của bạn.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Trò chuyện, khám phá video ngắn và lưu giữ những khoảnh khắc đáng nhớ trong một cộng đồng gần gũi.
          </Text>
          <View style={[styles.ctaRow, compact && styles.ctaRowCompact]}>
            <Pressable
              accessibilityHint="Mở trang ANKT trên Google Play"
              accessibilityRole="link"
              onPress={openGooglePlay}
              style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
            >
              <Ionicons color={theme.colors.primaryContrast} name="logo-google-playstore" size={28} />
              <View>
                <Text style={styles.playEyebrow}>TẢI XUỐNG TỪ</Text>
                <Text style={styles.playText}>Google Play</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/login")}
              style={({ pressed }) => [styles.webButton, pressed && styles.pressed]}
            >
              <Text style={styles.webButtonText}>Khám phá trên web</Text>
              <Ionicons color={theme.colors.text} name="arrow-forward" size={18} />
            </Pressable>
          </View>
          <View style={styles.trustRow}>
            <View style={styles.trustAvatars}>
              {["K", "H", "Q"].map((letter, index) => (
                <View key={letter} style={[styles.trustAvatar, { marginLeft: index === 0 ? 0 : -8 }]}>
                  <Text style={styles.trustInitial}>{letter}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.trustText}>Cùng kết nối trong cộng đồng ANKT</Text>
          </View>
        </View>
        <AppShowcase compact={compact} />
      </View>

      <View style={styles.benefitsSection}>
        <Text style={styles.sectionEyebrow}>MỌI THỨ BẠN CẦN, TRONG MỘT ỨNG DỤNG</Text>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Gần nhau hơn qua từng khoảnh khắc</Text>
        <View style={[styles.benefitGrid, compact && styles.benefitGridCompact]}>
          {benefits.map((benefit) => (
            <View key={benefit.title} style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Ionicons color={theme.colors.primary} name={benefit.icon} size={24} />
              </View>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.finalCta, compact && styles.finalCtaCompact]}>
        <View style={styles.finalCopy}>
          <Text style={styles.finalEyebrow}>ANKT TRÊN ĐIỆN THOẠI</Text>
          <Text accessibilityRole="header" style={styles.finalTitle}>Mang cộng đồng theo bạn, ở bất cứ đâu.</Text>
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={openGooglePlay}
          style={({ pressed }) => [styles.finalButton, pressed && styles.pressed]}
        >
          <Ionicons color={theme.colors.primaryContrast} name="logo-google-playstore" size={22} />
          <Text style={styles.finalButtonText}>Tải trên Google Play</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>ANKT</Text>
        <Text style={styles.footerText}>Kết nối thật · Chia sẻ thật</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  benefitCard: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 190, padding: spacing.xl },
  benefitGrid: { flexDirection: "row", gap: spacing.lg, marginTop: 36 },
  benefitGridCompact: { flexDirection: "column" },
  benefitIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 22, height: 44, justifyContent: "center", marginBottom: spacing.lg, width: 44 },
  benefitText: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: spacing.sm },
  benefitTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  benefitsSection: { maxWidth: 1180, paddingHorizontal: spacing.xl, paddingVertical: 84, width: "100%" },
  brand: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  brandName: { color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  ctaRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, marginTop: 32 },
  ctaRowCompact: { alignItems: "stretch", flexDirection: "column" },
  finalButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 12, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  finalButtonText: { color: colors.primaryContrast, fontSize: 15, fontWeight: "900" },
  finalCopy: { flex: 1 },
  finalCta: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: spacing.xl, marginBottom: 64, maxWidth: 1132, padding: 36, width: "calc(100% - 48px)" as never },
  finalCtaCompact: { alignItems: "stretch", flexDirection: "column" },
  finalEyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  finalTitle: { color: colors.text, fontSize: 27, fontWeight: "900", lineHeight: 35, marginTop: spacing.sm },
  footer: { alignItems: "center", borderTopColor: colors.borderSubtle, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", maxWidth: 1180, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, width: "100%" },
  footerBrand: { color: colors.text, fontSize: 18, fontWeight: "900" },
  footerText: { color: colors.textMuted, fontSize: 12 },
  glowTop: { backgroundColor: colors.primarySoft, borderRadius: 260, height: 520, opacity: 0.55, position: "absolute", right: -190, top: -230, width: 520 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", maxWidth: 1180, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, width: "100%", zIndex: 2 },
  headerActions: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  headerDownload: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerDownloadText: { color: colors.primaryContrast, fontSize: 13, fontWeight: "900" },
  hero: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", maxWidth: 1180, minHeight: 680, paddingHorizontal: spacing.xl, width: "100%" },
  heroCompact: { flexDirection: "column", paddingTop: 72 },
  heroCopy: { flex: 1, maxWidth: 610, paddingRight: 42 },
  heroCopyCompact: { alignItems: "center", maxWidth: 680, paddingRight: 0 },
  kicker: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primarySoft, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  kickerDot: { backgroundColor: colors.primary, borderRadius: 4, height: 7, width: 7 },
  kickerText: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  loginButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  loginText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  logo: { borderRadius: 18, height: 38, width: 38 },
  page: { alignItems: "center", minHeight: "100%", overflow: "hidden" },
  playButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 12, flexDirection: "row", gap: spacing.md, minHeight: 58, paddingHorizontal: spacing.xl },
  playEyebrow: { color: colors.primaryContrast, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  playText: { color: colors.primaryContrast, fontSize: 18, fontWeight: "900", marginTop: 1 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  screen: { backgroundColor: colors.background, flex: 1 },
  sectionEyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.5, textAlign: "center" },
  sectionTitle: { color: colors.text, fontSize: 34, fontWeight: "900", lineHeight: 42, marginTop: spacing.md, textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 17, lineHeight: 27, marginTop: spacing.xl, maxWidth: 540 },
  title: { color: colors.text, fontSize: 52, fontWeight: "900", letterSpacing: -1.8, lineHeight: 61, marginTop: spacing.xl },
  titleAccent: { color: colors.primary },
  titleCompact: { fontSize: 40, lineHeight: 48, textAlign: "center" },
  trustAvatar: { alignItems: "center", backgroundColor: colors.surfaceElevated, borderColor: colors.background, borderRadius: 16, borderWidth: 2, height: 32, justifyContent: "center", width: 32 },
  trustAvatars: { flexDirection: "row" },
  trustInitial: { color: colors.text, fontSize: 11, fontWeight: "900" },
  trustRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  trustText: { color: colors.textMuted, fontSize: 12 },
  webButton: { alignItems: "center", borderColor: colors.borderSubtle, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 58, paddingHorizontal: spacing.xl },
  webButtonText: { color: colors.text, fontSize: 14, fontWeight: "800" },
});
