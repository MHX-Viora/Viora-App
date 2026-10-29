import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAppToast } from '@/components/common/app-toast';
import { refreshCurrentUser } from '@/services/current-user.service';
import { getPosts } from '@/services/feed.service';
import { deletePost } from '@/services/post.service';
import { spacing, type ThemeColors, useTheme } from '@/theme';
import { canCreateArticle } from '@/types/account-style';
import type { User } from '@/types/auth';
import type { FeedPost } from '@/types/feed';

export function ArticleManagementScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<FeedPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const request = useRef(0);
  const allowed = canCreateArticle(user?.accountStyle);

  const load = useCallback(async (nextPage = 1) => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const current = await refreshCurrentUser();
      if (request.current !== id) return;
      setUser(current);
      if (!current || !canCreateArticle(current.accountStyle)) { setPosts([]); return; }
      const result = await getPosts({ userId: current.id, postType: 2, sort: 'latest', page: nextPage, pageSize: 20 });
      if (request.current !== id) return;
      const owned = result.posts.filter(post => post.postType === 2 && post.authorId === current.id);
      setPosts(previous => nextPage === 1 ? owned : [...previous, ...owned.filter(post => !previous.some(item => item.id === post.id))]);
      setPage(nextPage);
      setTotalPages(result.totalPages);
    } catch (failure) {
      if (request.current === id) setError(failure instanceof Error ? failure.message : 'Không thể tải bài báo.');
    } finally {
      if (request.current === id) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { request.current++; };
  }, [load]));

  const remove = async () => {
    if (!confirmDelete || deleting || !user || confirmDelete.authorId !== user.id) return;
    setDeleting(true);
    try {
      await deletePost(confirmDelete.id);
      setPosts(previous => previous.filter(post => post.id !== confirmDelete.id));
      setConfirmDelete(null);
      showAppToast({ message: 'Đã xóa bài báo.', type: 'success' });
    } catch (failure) {
      showAppToast({ message: failure instanceof Error ? failure.message : 'Không thể xóa bài báo.', type: 'error' });
    } finally { setDeleting(false); }
  };

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="Quay lại" accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')} style={styles.icon}>
        <Ionicons color={theme.colors.text} name="arrow-back" size={24} />
      </Pressable>
      <Text style={styles.title}>Quản lý bài báo</Text>
      {allowed ? <Pressable accessibilityRole="button" onPress={() => router.push('/article/editor')} style={styles.primaryButton}><Text style={styles.primaryText}>Viết bài</Text></Pressable> : null}
    </View>
    {loading && posts.length === 0 ? <ActivityIndicator accessibilityLabel="Đang tải bài báo" color={theme.colors.primary} style={styles.empty} /> : !allowed ? <View style={styles.empty}><Text style={styles.message}>Tài khoản chưa có quyền viết báo.</Text></View> : <FlatList
      data={posts} keyExtractor={item => item.id} contentContainerStyle={styles.content}
      refreshing={loading && page === 1} onRefresh={() => void load()}
      onEndReached={() => { if (!loading && !error && page < totalPages) void load(page + 1); }}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={!error ? <Text style={styles.message}>Bạn chưa có bài báo nào. Chọn “Viết bài” để bắt đầu.</Text> : null}
      ListHeaderComponent={error ? <View style={styles.card}><Text accessibilityRole="alert" style={styles.message}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.link}>Thử lại</Text></Pressable></View> : null}
      ListFooterComponent={loading && posts.length > 0 ? <ActivityIndicator color={theme.colors.primary} /> : null}
      renderItem={({ item }) => <View style={styles.card}>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/article/[id]', params: { id: item.id } })}>
          <Text numberOfLines={2} style={styles.articleTitle}>{item.article?.title || item.body || 'Bài báo'}</Text>
          {item.article?.preview ? <Text numberOfLines={2} style={styles.message}>{item.article.preview}</Text> : null}
        </Pressable>
        <Text style={styles.message}>{item.viewCount} lượt xem · {item.comments} bình luận</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={deleting} onPress={() => router.push({ pathname: '/article/editor', params: { id: item.id } })} style={styles.secondaryButton}><Text style={styles.link}>Chỉnh sửa</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={deleting} onPress={() => setConfirmDelete(item)} style={styles.secondaryButton}><Text style={styles.danger}>Xóa</Text></Pressable>
        </View>
      </View>}
    />}
    <Modal transparent animationType="fade" visible={Boolean(confirmDelete)} onRequestClose={() => { if (!deleting) setConfirmDelete(null); }}>
      <View style={styles.backdrop}><View style={styles.confirm}>
        <Text style={styles.articleTitle}>Xóa bài báo?</Text><Text style={styles.message}>Bài báo này sẽ được xóa khỏi hồ sơ và bảng tin.</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={deleting} onPress={() => setConfirmDelete(null)} style={styles.secondaryButton}><Text style={styles.link}>Giữ lại</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={deleting} onPress={() => void remove()} style={styles.secondaryButton}>{deleting ? <ActivityIndicator color={theme.colors.danger} /> : <Text style={styles.danger}>Xóa bài báo</Text>}</Pressable>
        </View>
      </View></View>
    </Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  icon: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md },
  primaryText: { color: colors.primaryContrast, fontWeight: '700' },
  content: { alignSelf: 'center', width: '100%', maxWidth: 760, gap: spacing.md, padding: spacing.lg, paddingBottom: 48 },
  empty: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, gap: spacing.md, padding: spacing.lg },
  articleTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: spacing.xs },
  message: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: spacing.md },
  secondaryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  link: { color: colors.primary, fontWeight: '700' }, danger: { color: colors.danger, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  confirm: { width: '100%', maxWidth: 440, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md, borderRadius: 16 },
});
