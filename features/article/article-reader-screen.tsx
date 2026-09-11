import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ArticleBlockView } from "@/components/article/article-renderer";
import { UserAvatar } from "@/components/common/user-avatar";
import { getResponsiveContentLayout } from "@/components/layout/responsive-layout";
import {
  getNextReadMilestone,
  getReadPercentage,
} from "@/features/article/article-reading-progress";
import { useResponsive } from "@/hooks/use-responsive";
import { getArticle, trackArticleInteraction } from "@/services/article.service";
import { layout, spacing, type ThemeColors, useTheme } from "@/theme";
import type { Article } from "@/types/article";

export function ArticleReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState("");
  const readingStartedAtRef = useRef(Date.now());
  const lastMilestoneRef = useRef(0);
  const latestPercentageRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    getArticle(id).then(setArticle).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải bài viết."));
  }, [id]);

  const sendReadingProgress = useCallback((articleId: string, percentage: number) => {
    const duration = Math.min(
      86_400,
      Math.max(0, Math.round((Date.now() - readingStartedAtRef.current) / 1000)),
    );
    void trackArticleInteraction(articleId, "view", {
      readDuration: duration,
      readPercentage: percentage,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!article) return;
    readingStartedAtRef.current = Date.now();
    lastMilestoneRef.current = 0;
    latestPercentageRef.current = 0;
    void trackArticleInteraction(article.id, "open").catch(() => undefined);

    return () => {
      if (latestPercentageRef.current > lastMilestoneRef.current) {
        sendReadingProgress(article.id, latestPercentageRef.current);
      }
    };
  }, [article, sendReadingProgress]);

  const handleScroll = useCallback((event: {
    nativeEvent: {
      contentOffset: { y: number };
      contentSize: { height: number };
      layoutMeasurement: { height: number };
    };
  }) => {
    if (!article) return;
    const percentage = getReadPercentage({
      contentHeight: event.nativeEvent.contentSize.height,
      offsetY: event.nativeEvent.contentOffset.y,
      viewportHeight: event.nativeEvent.layoutMeasurement.height,
    });
    latestPercentageRef.current = Math.max(latestPercentageRef.current, percentage);
    const milestone = getNextReadMilestone(percentage, lastMilestoneRef.current);
    if (milestone === null) return;
    lastMilestoneRef.current = milestone;
    sendReadingProgress(article.id, milestone);
  }, [article, sendReadingProgress]);

  if (!article && !error) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;
  if (!article) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <View style={styles.topBar}>
      <Pressable accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons color={theme.colors.text} name="arrow-back" size={26} /></Pressable>
      {article.isOwner ? <Pressable onPress={() => router.push({ pathname: "/article/editor", params: { id: article.id } })}><Text style={styles.edit}>Chỉnh sửa</Text></Pressable> : null}
    </View>
    <FlatList
      contentContainerStyle={styles.content}
      data={article.blocks}
      initialNumToRender={5}
      keyExtractor={(item) => item.id || String(item.orderIndex)}
      ListHeaderComponent={<View style={styles.header}><Text style={styles.title}>{article.title}</Text><View style={styles.authorRow}><UserAvatar displayName={article.author.displayName} imageUrl={article.author.avatarUrl} size={40} style={styles.avatar} /><View><Text style={styles.author}>{article.author.displayName}</Text><Text style={styles.meta}>{article.readingTimeMinutes} phút đọc · {article.viewCount} lượt xem</Text></View></View></View>}
      maxToRenderPerBatch={5}
      onScroll={handleScroll}
      renderItem={({ item }) => <ArticleBlockView block={item} />}
      ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
      style={getResponsiveContentLayout({
        isDesktopWeb,
        maxWidth: layout.articleMaxWidth,
      })}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={250}
      windowSize={5}
    />
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  author: { color: colors.text, fontSize: 15, fontWeight: "700" }, avatar: { borderRadius: 20, height: 40, width: 40 },
  authorRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  center: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: 60 }, edit: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  error: { color: colors.danger, textAlign: "center" }, header: { marginBottom: spacing.xl },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 }, screen: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.text, fontSize: 34, fontWeight: "900", lineHeight: 41 },
  topBar: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 56, paddingHorizontal: spacing.md },
});
