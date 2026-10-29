import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, type ThemeColors, useTheme } from '@/theme';
import type { Article } from '@/types/article';
import { withoutHashtags } from '@/utils/display-text';
import { getRelatedArticles, type RelatedArticle } from './article-related-posts';

export function ArticleRelatedPostsCard({ article }: { article: Pick<Article, 'id' | 'hashtags'> }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [items, setItems] = useState<RelatedArticle[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setItems(null);
    setError('');
    void getRelatedArticles(article).then(results => { if (active) setItems(results); })
      .catch(() => { if (active) setError('Không thể tải bài viết liên quan.'); });
    return () => { active = false; };
  }, [article, retry]);

  return <View accessibilityLabel="Bài viết liên quan" style={styles.card}>
    <Text accessibilityRole="header" style={styles.heading}>Bài viết liên quan</Text>
    {error ? <View style={styles.state}>
      <Text accessibilityRole="alert" style={styles.muted}>{error}</Text>
      <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable>
    </View> : items === null ? <View accessibilityLabel="Đang tải bài viết liên quan" style={styles.loading}><ActivityIndicator color={theme.colors.primary} size="small" /></View>
      : items.length === 0 ? <Text style={styles.muted}>Chưa có bài viết cùng chủ đề.</Text>
        : items.map(({ post, topics }) => <Pressable key={post.id}
          accessibilityRole="link" accessibilityLabel={`Đọc bài liên quan: ${withoutHashtags(post.article!.title)}`}
          onPress={() => router.push({ pathname: '/article/[id]', params: { id: post.id } })}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          {post.article!.thumbnailUrl ? <Image source={{ uri: post.article!.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" transition={150} />
            : <View style={[styles.thumbnail, styles.placeholder]}><Ionicons color={theme.colors.primary} name="newspaper-outline" size={24} /></View>}
          <View style={styles.copy}>
            <Text numberOfLines={2} style={styles.title}>{withoutHashtags(post.article!.title)}</Text>
            <Text numberOfLines={1} style={styles.muted}>#{topics[0]} · {post.article!.readingTimeMinutes} phút đọc</Text>
          </View>
        </Pressable>)}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  heading: { color: colors.text, fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 60 },
  thumbnail: { width: 72, height: 56, borderRadius: 8, backgroundColor: colors.primarySoft },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  loading: { alignItems: 'center', paddingVertical: spacing.md },
  state: { gap: spacing.sm },
  retry: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  retryText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  pressed: { opacity: 0.7 },
});
