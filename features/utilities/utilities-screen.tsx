import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_BOTTOM, TAB_BAR_HEIGHT } from "@/components/layout/tab-bar-style";
import { WalletSummaryCard } from "@/components/wallet/wallet-summary-card";
import { WalletPromotionRow } from "@/components/utilities/wallet-promotion-row";
import { MiniAppSection } from "@/components/mini-apps/mini-app-section";
import { FeaturedBrandsSection } from '@/components/utilities/featured-brands-section';
import { miniAppsEnabled } from "@/features/mini-apps/lib/host-controller";
import { useResponsive } from "@/hooks/use-responsive";
import { getWallet } from "@/services/wallet.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { Wallet } from "@/types/wallet";
import { getUtilityBanners } from '@/services/utility-banner.service';
import { safeBannerTarget, type UtilityBanner } from '@/types/utility-banner';

export function UtilitiesScreen() {
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const insets = useSafeAreaInsets();
  const bottomPadding = isDesktopWeb ? 44 : TAB_BAR_BOTTOM + TAB_BAR_HEIGHT + insets.bottom + spacing.lg;
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banners, setBanners] = useState<UtilityBanner[]>([]);
  const [bannerActive, setBannerActive] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [miniAppY, setMiniAppY] = useState(0);
  const showMiniApps = miniAppsEnabled && Platform.OS === "web";

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
  useFocusEffect(useCallback(() => {
    setBannerActive(true);
    const controller = new AbortController();
    void getUtilityBanners(controller.signal).then(items => { if (!controller.signal.aborted) setBanners(items); }).catch(() => {});
    return () => { controller.abort(); setBannerActive(false); };
  }, []));
  const navigate = (path: string) => router.push(path as Href);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, isDesktopWeb && styles.desktop, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        <WalletPromotionRow banners={banners} active={bannerActive} onBannerOpen={target => {
          if (!safeBannerTarget(target)) return;
          if (target.startsWith('/')) navigate(target);
          else void Linking.openURL(target).catch(() => {});
        }} onExplore={showMiniApps ? () => scrollRef.current?.scrollTo({ y: miniAppY, animated: false }) : undefined}>
          <WalletSummaryCard
          error={error}
          loading={loading}
          onDeposit={() => navigate("/wallet/deposit")}
          onHistory={() => navigate("/wallet/history")}
          onRetry={() => void loadWallet()}
          onWithdraw={() => navigate("/wallet/withdraw")}
          wallet={wallet}
          />
        </WalletPromotionRow>
        {showMiniApps ? <View onLayout={({ nativeEvent }) => setMiniAppY(nativeEvent.layout.y)}>
          <MiniAppSection onOpen={appId => navigate(`/mini-apps/${appId}`)} />
        </View> : null}

        <FeaturedBrandsSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg, paddingTop: spacing.lg },
  desktop: { alignSelf: "center", maxWidth: 1040, width: "100%" },
  screen: { backgroundColor: colors.background, flex: 1 },
  });
};
