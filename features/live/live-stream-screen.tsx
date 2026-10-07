import Ionicons from "@expo/vector-icons/Ionicons";
import { LiveCoverImage } from "./live-cover-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { LiveCreatorAvatar } from "@/features/live/live-creator-avatar";
import { FeedCategoryHeader } from "@/components/feed/feed-category-header";
import { FixedTopBar } from "@/components/layout/fixed-top-bar";
import { getFixedTopBarLayout, getResponsiveContentLayout } from "@/components/layout/responsive-layout";
import { useResponsive } from "@/hooks/use-responsive";
import { layout, spacing, type ThemeColors, useTheme } from "@/theme";
import { getLiveCategories, getLives } from "@/services/live.service";

import { toLiveStreamPreview, type LiveStreamPreview } from "./live-stream-model";

type LiveTopicFilter = string;


export function LiveStreamScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, isDesktopWeb, isLargeDesktop, isWeb } = useResponsive();
  const showDesktopCategoryRail = isDesktopWeb && isLargeDesktop;
  const categoryTopBarLayout = getFixedTopBarLayout({
    categoryOnly: true,
    isCompactWeb: isWeb && !isDesktopWeb,
    isDesktopWeb,
    useDesktopSideRails: showDesktopCategoryRail,
  });
  const desktopContentLeft = Math.max(
    layout.pageGutter + 240 + spacing.xl,
    Math.floor((width - 1200) / 2),
  );
  const [selectedTopic, setSelectedTopic] = useState<LiveTopicFilter>("Tất cả");
  const [liveStreams, setLiveStreams] = useState<LiveStreamPreview[]>([]);
  const [liveStreamTopics, setLiveStreamTopics] = useState<string[]>(["Tất cả"]);
  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = () => {
      void getLives().then((lives) => { if (active) setLiveStreams(lives.map(toLiveStreamPreview)); }).catch(() => { if (active) setLiveStreams([]); });
    };
    refresh();
    void getLiveCategories().then((categories) => { if (active) setLiveStreamTopics(["Tất cả", ...categories.map((category) => category.name)]); }).catch(() => undefined);
    const timer = setInterval(refresh, 15_000);
    return () => { active = false; clearInterval(timer); };
  }, []));
  const columns = width >= 1080 ? 3 : width >= 360 ? 2 : 1;
  const gridWidth = Math.min(
    1200,
    showDesktopCategoryRail ? width - desktopContentLeft - layout.pageGutter : width,
  ) - spacing.md * 2;
  const cardWidth = (gridWidth - spacing.md * (columns - 1)) / columns;
  const filteredStreams = liveStreams.filter(
    (stream) => selectedTopic === "Tất cả" || stream.topic === selectedTopic,
  );

  const renderStream = ({ item }: { item: LiveStreamPreview }) => (
    <Pressable
      accessibilityLabel={`Xem live: ${item.title}`}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/live/[id]", params: { id: item.id } })}
      style={({ pressed }) => [styles.streamCard, columns > 1 && { width: cardWidth }, pressed && styles.cardPressed]}
    >
      <View style={styles.thumbnailWrap}>
        <LiveCoverImage fill source={item.thumbnailSource ?? item.thumbnailUrl} />
        <View style={styles.imageShade} />
        <View style={styles.liveBadge}><Ionicons color={colors.white} name="radio" size={13} /><Text style={styles.liveText}>LIVE</Text></View>
        <View accessibilityLabel={`Số người xem: ${item.viewerCount}`} style={styles.viewerBadge}>
          <Ionicons color={colors.white} name="eye" size={13} />
          <Text style={styles.viewerText}>{formatViewerCount(item.viewerCount)}</Text>
        </View>
        <View style={styles.topicBadge}><Text style={styles.topicBadgeText}>{item.topic}</Text></View>
      </View>
      <View style={styles.cardDetails}>
        <LiveCreatorAvatar size={36} stream={item} style={styles.avatar} />
        <View style={styles.cardText}>
          <Text numberOfLines={1} style={styles.streamTitle}>{item.title}</Text>
          <Text numberOfLines={1} style={styles.creatorName}>{item.creator}</Text>
        </View>
        <Ionicons color={colors.textMuted} name="ellipsis-vertical" size={19} />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.page}>
      <FixedTopBar categoryOnly>
        <View style={getResponsiveContentLayout({ isDesktopWeb, maxWidth: layout.feedMaxWidth })}>
          <FeedCategoryHeader
            activeCategory="live"
            onArticlesPress={() => router.replace({ pathname: "/(tabs)", params: { category: "articles" } })}
            onCommunityPress={() => router.replace({ pathname: "/(tabs)", params: { category: "community" } })}
            onLivePress={() => undefined}
            onReelsPress={() => router.replace("/(tabs)/reels")}
          />
        </View>
      </FixedTopBar>
    <FlatList
      key={columns}
      contentContainerStyle={[styles.listContent, { paddingTop: categoryTopBarLayout.height }]}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      data={filteredStreams}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<View style={styles.empty}><Ionicons color={colors.textMuted} name="radio-outline" size={30} /><Text style={styles.emptyText}>Chưa có buổi live trong chủ đề này.</Text></View>}
      ListHeaderComponent={
        <View style={[styles.content, getResponsiveContentLayout({ isDesktopWeb, maxWidth: 1200 })]}>
          <View style={styles.hero}>
            <View style={[styles.heroImage, width < 520 && styles.heroImageNarrow]}><LiveCoverImage fill /></View>
            <View style={[styles.heroCopy, width < 520 && styles.heroCopyNarrow]}>
              <View style={styles.heroEyebrow}><Ionicons color={colors.white} name="radio" size={15} /><Text style={styles.heroEyebrowText}>LIVE TRÊN ANKT</Text></View>
              <Text style={[styles.heroTitle, width < 520 && styles.heroTitleNarrow]}>Khám phá những buổi live đang diễn ra</Text>
              <Text style={[styles.heroDescription, width < 520 && styles.heroDescriptionNarrow]}>Gặp gỡ, trò chuyện và ủng hộ những nhà sáng tạo bạn yêu thích.</Text>
              {liveStreams.length ? <View style={styles.heroPeople}><View style={styles.avatarStack}>{liveStreams.slice(0, 3).map((stream) => <LiveCreatorAvatar key={stream.id} size={27} stream={stream} />)}</View><Text style={styles.heroPeopleText}>Cộng đồng đang lên sóng</Text></View> : null}
            </View>
            <View style={styles.heroLiveTag}><Ionicons color={colors.white} name="radio" size={13} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>

          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionTitle}>Đang live</Text><Text style={styles.sectionSubtitle}>{filteredStreams.length} buổi phát đang diễn ra</Text></View>
            <View style={styles.sectionActions}>
              <Pressable accessibilityRole="button" onPress={() => router.push("/live/host")} style={({ pressed }) => [styles.startLiveButton, pressed && styles.cardPressed]}><Ionicons color={colors.primaryContrast} name="videocam-outline" size={17} /><Text style={styles.startLiveText}>{width < 480 ? "Live" : "Bắt đầu live"}</Text></Pressable>
              {width >= 768 ? <View style={styles.sortLabel}><Ionicons color={colors.primary} name="sparkles-outline" size={16} /><Text style={styles.sortText}>Dành cho bạn</Text></View> : null}
            </View>
          </View>
          <FlatList
            contentContainerStyle={styles.filters}
            data={liveStreamTopics}
            horizontal
            keyExtractor={(topic) => topic}
            renderItem={({ item }) => {
              const selected = item === selectedTopic;
              return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSelectedTopic(item)} style={[styles.filter, selected && styles.filterActive]}><Text style={[styles.filterText, selected && styles.filterTextActive]}>{item}</Text></Pressable>;
            }}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      }
      numColumns={columns}
      renderItem={renderStream}
      showsVerticalScrollIndicator={false}
      style={[
        styles.screen,
        showDesktopCategoryRail
          ? { marginLeft: desktopContentLeft, marginRight: layout.pageGutter, maxWidth: 1200 }
          : styles.centeredScreen,
      ]}
    />
    </View>
  );
}

function formatViewerCount(count: number) {
  return count >= 1000 ? `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1).replace(".0", "")}K` : String(count);
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 },
  screen: { backgroundColor: colors.background, flex: 1 },
  centeredScreen: { alignSelf: "center", maxWidth: 1200, width: "100%" },
  listContent: { alignSelf: "center", paddingBottom: spacing.xl, paddingHorizontal: spacing.md, width: "100%" },
  content: { alignSelf: "center", paddingTop: spacing.lg, width: "100%" },
  hero: { backgroundColor: "#201344", borderColor: "#56318A", borderRadius: 18, borderWidth: 1, flexDirection: "row", minHeight: 188, overflow: "hidden", position: "relative" },
  heroImage: { height: "100%", opacity: 0.96, position: "absolute", right: 0, top: 0, width: "40%" },
  heroImageNarrow: { width: "34%" },
  heroCopy: { justifyContent: "center", maxWidth: "67%", minHeight: 188, padding: spacing.lg, zIndex: 1 },
  heroCopyNarrow: { maxWidth: "62%", minHeight: 168, padding: spacing.md },
  heroEyebrow: { alignItems: "center", flexDirection: "row", gap: 6, marginBottom: spacing.xs },
  heroEyebrowText: { color: "#68F0D0", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: "#FFFFFF", fontSize: 25, fontWeight: "800", lineHeight: 31, maxWidth: 540 },
  heroTitleNarrow: { fontSize: 21, lineHeight: 26 },
  heroDescription: { color: "#DED6F4", fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 500 },
  heroDescriptionNarrow: { fontSize: 12, lineHeight: 17 },
  heroPeople: { alignItems: "center", flexDirection: "row", gap: 9, marginTop: spacing.md },
  avatarStack: { flexDirection: "row" },
  heroPeopleText: { color: "#DED6F4", fontSize: 12, fontWeight: "600" },
  heroLiveTag: { alignItems: "center", backgroundColor: colors.danger, borderRadius: 7, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 6, position: "absolute", right: 12, top: 12 },
  liveText: { color: colors.white, fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md, marginTop: spacing.xl },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  sectionSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  sectionActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  startLiveButton: { alignItems: "center", backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: 12, paddingVertical: 8 },
  startLiveText: { color: colors.primaryContrast, fontSize: 12, fontWeight: "800" },
  sortLabel: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: 10, paddingVertical: 8 },
  sortText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  filters: { gap: 8, paddingBottom: spacing.md },
  filter: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: colors.primaryContrast },
  row: { gap: spacing.md },
  streamCard: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 15, borderWidth: 1, marginBottom: spacing.md, overflow: "hidden" },
  cardPressed: { opacity: 0.78 },
  thumbnailWrap: { aspectRatio: 16 / 9, backgroundColor: colors.secondaryBackground, overflow: "hidden", position: "relative", width: "100%" },
  imageShade: { backgroundColor: "rgba(5, 12, 23, 0.12)", ...StyleSheet.absoluteFillObject },
  liveBadge: { alignItems: "center", backgroundColor: colors.danger, borderRadius: 6, flexDirection: "row", gap: 5, left: 10, paddingHorizontal: 8, paddingVertical: 5, position: "absolute", top: 10 },
  viewerBadge: { alignItems: "center", backgroundColor: "rgba(5, 12, 23, 0.72)", borderRadius: 6, flexDirection: "row", gap: 5, paddingHorizontal: 8, paddingVertical: 5, position: "absolute", right: 10, top: 10 },
  viewerText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  topicBadge: { backgroundColor: "rgba(5, 12, 23, 0.66)", borderRadius: 6, bottom: 10, left: 10, paddingHorizontal: 8, paddingVertical: 5, position: "absolute" },
  topicBadgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  cardDetails: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 59, paddingHorizontal: 11, paddingVertical: 9 },
  avatar: { borderColor: colors.primary, borderWidth: 1.5 },
  cardText: { flex: 1, gap: 4 },
  streamTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  creatorName: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  empty: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
