import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WalletSummaryCard } from "@/components/wallet/wallet-summary-card";
import { useResponsive } from "@/hooks/use-responsive";
import { getWallet } from "@/services/wallet.service";
import { spacing, type ThemeColors, type WalletTheme, useTheme } from "@/theme";
import type { Wallet } from "@/types/wallet";

export function UtilitiesScreen() {
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const palette = theme.wallet;
  const styles = useMemo(() => createStyles(theme.colors, theme.wallet), [theme.colors, theme.wallet]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setError(null);
    try {
      setWallet(await getWallet());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải Ví ANKT.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadWallet(); }, [loadWallet]));
  const navigate = (path: string) => router.push(path as Href);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop]} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.pageTitle}>Tiện ích</Text>
            <Text style={styles.subtitle}>Nhiều tiện ích hơn cho trải nghiệm trọn vẹn</Text>
          </View>
        </View>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Ionicons color={theme.colors.warning} name="cloud-offline-outline" size={24} />
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Chưa thể tải Ví ANKT</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => void loadWallet()}><Text style={styles.retry}>Thử lại</Text></Pressable>
          </View>
        ) : (
          <WalletSummaryCard
            loading={loading}
            onDeposit={() => navigate("/wallet/deposit")}
            onHistory={() => navigate("/wallet/history")}
            onWithdraw={() => navigate("/wallet/withdraw")}
            wallet={wallet}
          />
        )}

        <View style={styles.utilityRow}>
          <View style={[styles.utilityTile, styles.miniAppTile]}>
            <View style={styles.utilityTopRow}>
              <View style={styles.utilityIcon}><Ionicons color={palette.miniAccent} name="grid" size={23} /></View>
              <View style={styles.miniChevron}><Ionicons color={palette.miniAccent} name="chevron-forward" size={16} /></View>
            </View>
            <Text style={styles.utilityTitle}>Mini App</Text>
            <Text style={styles.comingSoon}>Sắp ra mắt</Text>
            <Text style={styles.utilityBody}>Khám phá các ứng dụng tiện ích trong ANKT</Text>
            <View pointerEvents="none" style={styles.miniGift}>
              <View style={styles.miniCubeSmall} />
              <Ionicons color={palette.miniAccent} name="cube" size={38} />
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => navigate("/advertisements")} style={[styles.utilityTile, styles.moreTile]}>
            <View style={styles.utilityTopRow}>
              <View style={styles.utilityIconMuted}><Ionicons color={palette.moreAccent} name="apps-outline" size={24} /></View>
              <View style={styles.moreChevron}><Ionicons color={palette.moreAccent} name="chevron-forward" size={16} /></View>
            </View>
            <Text style={styles.utilityTitle}>Quảng cáo</Text>
            <Text style={styles.utilityBody}>Tạo chiến dịch và theo dõi hiệu quả quảng cáo của bạn</Text>
            <View pointerEvents="none" style={styles.moreGift}>
              <Text style={styles.giftSparkles}>✦</Text>
              <Ionicons color={palette.moreAccent} name="cube" size={42} />
            </View>
          </Pressable>
        </View>

        <View style={styles.futureBanner}>
          <View pointerEvents="none" style={styles.futureGlow} />
          <View style={styles.futureCopy}>
            <Text style={styles.futureTitle}>Nhiều tiện ích hơn đang chờ bạn!</Text>
            <Text style={styles.futureBody}>Chúng tôi đang phát triển thêm nhiều tính năng hữu ích để mang đến trải nghiệm tốt hơn.</Text>
          </View>
          <View style={styles.futureIcon}><Ionicons color={palette.bannerAccent} name="sparkles" size={42} /></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, palette: WalletTheme) => {
  return StyleSheet.create({
  comingSoon: { alignSelf: "flex-start", backgroundColor: palette.miniSoft, borderRadius: 10, color: palette.miniAccent, fontSize: 10, fontWeight: "700", marginTop: spacing.xs, overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: 3 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 44, paddingTop: spacing.lg },
  desktop: { alignSelf: "center", maxWidth: 760, width: "100%" },
  errorCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 112, padding: spacing.lg },
  errorCopy: { flex: 1 },
  errorText: { color: palette.muted, fontSize: 12, marginTop: 3 },
  errorTitle: { color: palette.text, fontSize: 14, fontWeight: "800" },
  futureBanner: { alignItems: "center", backgroundColor: palette.bannerBackground, borderColor: palette.bannerBorder, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 154, overflow: "hidden", padding: spacing.lg },
  futureBody: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  futureCopy: { flex: 1, zIndex: 2 },
  futureGlow: { backgroundColor: palette.glow, borderRadius: 100, height: 190, position: "absolute", right: -62, top: -78, transform: [{ rotate: "-20deg" }], width: 210 },
  futureIcon: { alignItems: "center", backgroundColor: palette.iconBackground, borderRadius: 38, height: 76, justifyContent: "center", width: 76, zIndex: 2 },
  futureTitle: { color: palette.text, fontSize: 20, fontWeight: "900", lineHeight: 24 },
  giftSparkles: { color: colors.warning, fontSize: 18, position: "absolute", right: 1, top: -12, zIndex: 2 },
  headerCopy: { flex: 1 },
  pageHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  miniAppTile: { backgroundColor: palette.miniBackground, borderColor: palette.miniBorder },
  miniChevron: { alignItems: "center", backgroundColor: palette.miniSoft, borderRadius: 16, height: 30, justifyContent: "center", width: 30 },
  miniCubeSmall: { backgroundColor: palette.miniAccent, borderRadius: 3, height: 8, left: -5, position: "absolute", top: 5, transform: [{ rotate: "20deg" }], width: 8 },
  miniGift: { alignItems: "center", bottom: 8, flexDirection: "row", position: "absolute", right: 8 },
  moreChevron: { alignItems: "center", backgroundColor: palette.moreSoft, borderRadius: 16, height: 30, justifyContent: "center", width: 30 },
  moreGift: { bottom: 7, position: "absolute", right: 8 },
  moreTile: { backgroundColor: palette.moreBackground, borderColor: palette.moreBorder },
  pageTitle: { color: palette.text, fontSize: 30, fontWeight: "900", letterSpacing: -0.7 },
  retry: { color: palette.accent, fontSize: 13, fontWeight: "800" },
  screen: { backgroundColor: colors.background, flex: 1 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 21, marginTop: spacing.xs },
  utilityBody: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: spacing.sm, maxWidth: "82%", zIndex: 2 },
  utilityIcon: { alignItems: "center", backgroundColor: palette.miniSoft, borderRadius: 13, height: 44, justifyContent: "center", width: 44 },
  utilityIconMuted: { alignItems: "center", backgroundColor: palette.moreSoft, borderRadius: 13, height: 44, justifyContent: "center", width: 44 },
  utilityRow: { flexDirection: "row", gap: spacing.md },
  utilityTile: { borderRadius: 16, borderWidth: 1, flex: 1, minHeight: 184, overflow: "hidden", padding: spacing.md },
  utilityTitle: { color: palette.text, fontSize: 15, fontWeight: "800", marginTop: spacing.md },
  utilityTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  });
};
