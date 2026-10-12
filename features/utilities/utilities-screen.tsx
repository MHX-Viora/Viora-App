import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WalletSummaryCard } from "@/components/wallet/wallet-summary-card";
import { MiniAppCatalog } from "@/features/mini-apps/catalog";
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
    setLoading(true);
    setError(null);
    try {
      setWallet(await getWallet());
    } catch {
      setError("Không thể tải số dư. Vui lòng thử lại.");
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
            <Text style={styles.subtitle}>Quản lý ví và các tiện ích dành cho tài khoản của bạn.</Text>
          </View>
        </View>

        <WalletSummaryCard
          error={error}
          loading={loading}
          onDeposit={() => navigate("/wallet/deposit")}
          onHistory={() => navigate("/wallet/history")}
          onRetry={() => void loadWallet()}
          onWithdraw={() => navigate("/wallet/withdraw")}
          wallet={wallet}
        />

        <MiniAppCatalog />

        <Pressable accessibilityRole="link" onPress={() => navigate("/developers")} style={styles.futureBanner}>
          <Ionicons color={palette.bannerAccent} name="code-slash-outline" size={32} />
          <View style={styles.futureCopy}>
            <Text style={styles.futureTitle}>ANKT Developers</Text>
            <Text style={styles.futureBody}>Hướng dẫn chuẩn bị website đối tác, SSO và bảo mật tích hợp.</Text>
          </View>
          <Ionicons color={palette.bannerAccent} name="arrow-forward" size={22} />
        </Pressable>

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
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 44, paddingTop: spacing.lg },
  desktop: { alignSelf: "center", maxWidth: 1040, width: "100%" },
  futureBanner: { alignItems: "center", backgroundColor: palette.bannerBackground, borderColor: palette.bannerBorder, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 154, overflow: "hidden", padding: spacing.lg },
  futureBody: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  futureCopy: { flex: 1, zIndex: 2 },
  futureGlow: { backgroundColor: palette.glow, borderRadius: 100, height: 190, position: "absolute", right: -62, top: -78, transform: [{ rotate: "-20deg" }], width: 210 },
  futureIcon: { alignItems: "center", backgroundColor: palette.iconBackground, borderRadius: 38, height: 76, justifyContent: "center", width: 76, zIndex: 2 },
  futureTitle: { color: palette.text, fontSize: 20, fontWeight: "900", lineHeight: 24 },
  headerCopy: { flex: 1 },
  pageHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  pageTitle: { color: colors.text, fontSize: 24, fontWeight: "700", lineHeight: 32 },
  screen: { backgroundColor: colors.background, flex: 1 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  });
};
