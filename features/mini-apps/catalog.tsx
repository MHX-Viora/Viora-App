import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/theme';
import { miniAppsApi } from './api';
import { MiniAppDetail } from './detail';
import { LinkedApps } from './linked-apps';
import type { Banner, CatalogPage, Category, Rail } from './types';

const rails: [Rail, string][] = [['all', 'Tất cả'], ['favorites', 'Yêu thích'], ['recent', 'Gần đây'], ['featured', 'Nổi bật'], ['popular', 'Phổ biến'], ['new', 'Mới phát hành'], ['recommended', 'Dành cho bạn']];
export function MiniAppCatalog() {
  const { theme } = useTheme(); const c = theme.colors; const { width } = useWindowDimensions();
  const [rail, setRail] = useState<Rail>('all'); const [search, setSearch] = useState(''); const [term, setTerm] = useState('');
  const [category, setCategory] = useState<string>(); const [categories, setCategories] = useState<Category[]>([]); const [banners, setBanners] = useState<Banner[]>([]);
  const [page, setPage] = useState(1); const [result, setResult] = useState<CatalogPage>(); const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); const [selected, setSelected] = useState<string>(); const [refresh, setRefresh] = useState(0);
  const [linked, setLinked] = useState(false);
  const columns = width >= 1200 ? 8 : width >= 768 ? 6 : width >= 430 ? 5 : 4;
  const styles = useMemo(() => StyleSheet.create({
    section: { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 16 },
    text: { color: c.text, fontSize: 14 }, title: { color: c.text, fontSize: 20, fontWeight: '700' }, muted: { color: c.textMuted, fontSize: 12, lineHeight: 18 },
    search: { backgroundColor: c.input, borderColor: c.border, borderWidth: 1, borderRadius: 10, color: c.text, padding: 12 },
    chip: { borderColor: c.border, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginRight: 8 },
    selected: { backgroundColor: c.primarySoft, borderColor: c.primary }, grid: { flexDirection: 'row', flexWrap: 'wrap' },
    tile: { alignItems: 'center', gap: 8, padding: 6, marginBottom: 12 }, icon: { width: 48, height: 48, borderRadius: 12, backgroundColor: c.secondaryBackground },
    fallback: { alignItems: 'center', justifyContent: 'center' }, label: { color: c.text, fontSize: 12, lineHeight: 16, textAlign: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, button: { padding: 10, borderRadius: 8, backgroundColor: c.primarySoft },
    danger: { color: c.danger }, banner: { width: 260, height: 110, borderRadius: 12, marginRight: 12 },
  }), [c]);
  useEffect(() => { const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useFocusEffect(useCallback(() => { setRefresh(n => n + 1); let active = true;
    void Promise.allSettled([miniAppsApi.categories(), miniAppsApi.banners()]).then(([a, b]) => { if (!active) return; if (a.status === 'fulfilled') setCategories(a.value); if (b.status === 'fulfilled') setBanners(b.value); });
    return () => { active = false; };
  }, []));
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError('');
    void miniAppsApi.catalog(rail, term, category, page, controller.signal).then(data => { if (!controller.signal.aborted) setResult(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [rail, term, category, page, refresh]);
  const changeRail = (value: Rail) => { setRail(value); setPage(1); };
  const clear = async () => { try { await miniAppsApi.clearHistory(); setRefresh(n => n + 1); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể xóa lịch sử.'); } };
  const moveFavorite = async (id: string, direction: number) => {
    try {
      const first = await miniAppsApi.catalog('favorites', '', undefined, 1);
      const pages = await Promise.all(Array.from({ length: Math.ceil(first.total / first.pageSize) - 1 }, (_, i) => miniAppsApi.catalog('favorites', '', undefined, i + 2)));
      const ids = [...first.items, ...pages.flatMap(page => page.items)].map(app => app.id); const index = ids.indexOf(id); const target = index + direction;
      if (index < 0 || target < 0 || target >= ids.length) return;
      [ids[index], ids[target]] = [ids[target], ids[index]]; await miniAppsApi.reorder(ids); setRefresh(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể đổi thứ tự.'); }
  };
  return <View style={styles.section}>
    <View style={styles.row}><Text accessibilityRole="header" style={styles.title}>Mini App</Text><Ionicons name="apps-outline" size={22} color={c.primary} /></View>
    <Text style={styles.muted}>Khám phá dịch vụ của đối tác ngay trong ANKT.</Text>
    <Pressable accessibilityRole="button" onPress={() => setLinked(true)}><Text style={styles.muted}>Quản lý ứng dụng đã kết nối</Text></Pressable>
    {banners.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false}>{banners.map(b => <Pressable accessibilityRole="button" accessibilityLabel={b.title} key={b.id} onPress={() => { if (b.miniAppId) setSelected(b.miniAppId); else { setCategory(b.categoryId); setPage(1); setRail('all'); } }}><Image source={{ uri: b.imageUrl }} style={styles.banner} /><Text style={styles.muted}>{b.title}</Text></Pressable>)}</ScrollView>}
    <TextInput accessibilityLabel="Tìm Mini App" placeholder="Tìm ứng dụng, dịch vụ…" placeholderTextColor={c.placeholder} value={search} onChangeText={setSearch} maxLength={120} style={styles.search} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>{rails.map(([value, label]) => <Pressable accessibilityRole="button" accessibilityState={{ selected: rail === value }} key={value} style={[styles.chip, rail === value && styles.selected]} onPress={() => changeRail(value)}><Text style={styles.text}>{label}</Text></Pressable>)}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>{[{ id: '', name: 'Mọi danh mục', icon: 'apps-outline', sortOrder: 0 }, ...categories].map(item => <Pressable accessibilityRole="button" key={item.id} style={[styles.chip, styles.row, (category ?? '') === item.id && styles.selected]} onPress={() => { setCategory(item.id || undefined); setPage(1); }}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} color={c.primary} size={18} /><Text style={styles.text}>{item.name}</Text></Pressable>)}</ScrollView>
    {rail === 'recent' && <Pressable accessibilityRole="button" onPress={() => void clear()}><Text style={styles.muted}>Xóa lịch sử của tôi</Text></Pressable>}
    {loading ? <ActivityIndicator color={c.primary} accessibilityLabel="Đang tải Mini App" /> : error ? <View><Text accessibilityRole="alert" style={styles.danger}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRefresh(n => n + 1)} style={styles.button}><Text style={styles.text}>Thử lại</Text></Pressable></View> : !result?.items.length ? <Text style={styles.muted}>{rail === 'favorites' ? 'Chưa có ứng dụng yêu thích. Chọn ứng dụng rồi nhấn Ghim.' : rail === 'recent' ? 'Ứng dụng bạn mở sẽ xuất hiện tại đây.' : 'Chưa có ứng dụng phù hợp. Thử danh mục hoặc từ khóa khác.'}</Text> : <View style={styles.grid}>{result.items.map(app => <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${app.name}`} key={app.id} style={[styles.tile, { width: `${100 / columns}%` }]} onPress={() => setSelected(app.id)}>
      {app.iconUrl ? <Image source={{ uri: app.iconUrl }} style={styles.icon} /> : <View style={[styles.icon, styles.fallback]}><Ionicons name="apps-outline" color={c.primary} size={26} /></View>}
      <Text numberOfLines={2} style={styles.label}>{app.name}{result.favoriteIds.includes(app.id) ? ' ★' : ''}</Text>
    </Pressable>)}</View>}
    {!loading && !!result && result.total > result.pageSize && <View style={styles.row}><Pressable accessibilityRole="button" disabled={page === 1} onPress={() => setPage(p => p - 1)} style={styles.button}><Text style={styles.text}>Trước</Text></Pressable><Text style={styles.muted}>{page} / {Math.ceil(result.total / result.pageSize)}</Text><Pressable accessibilityRole="button" disabled={page * result.pageSize >= result.total} onPress={() => setPage(p => p + 1)} style={styles.button}><Text style={styles.text}>Sau</Text></Pressable></View>}
    {rail === 'favorites' && result && !loading && !error && result.items.map(app => <View key={app.id} style={styles.row}><Text style={[styles.text, { flex: 1 }]}>{app.name}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Đưa ${app.name} lên trước`} onPress={() => void moveFavorite(app.id, -1)} style={styles.button}><Ionicons name="arrow-up" color={c.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Đưa ${app.name} xuống sau`} onPress={() => void moveFavorite(app.id, 1)} style={styles.button}><Ionicons name="arrow-down" color={c.text} /></Pressable></View>)}
    {selected && <MiniAppDetail id={selected} favorite={result?.favoriteIds.includes(selected) ?? false} onClose={() => setSelected(undefined)} onChanged={() => setRefresh(n => n + 1)} />}
    {linked && <LinkedApps onClose={() => setLinked(false)} />}
  </View>;
}
