import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getFeaturedBrands } from '@/services/featured-brand.service';
import { spacing, useTheme } from '@/theme';
import type { FeaturedBrand } from '@/types/featured-brand';
import { FeaturedBrandsGrid } from './featured-brands-grid';

export function FeaturedBrandsSection() {
  const { theme } = useTheme();
  const [brands, setBrands] = useState<FeaturedBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(false);
    void getFeaturedBrands(controller.signal).then(items => { if (!controller.signal.aborted) setBrands(items); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  }, []);
  useFocusEffect(useCallback(() => { load(); return () => request.current?.abort(); }, [load]));

  return <View testID="featured-brands-section" style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderSubtle }]}>
    <View style={styles.heading}>
      <View accessible={false} importantForAccessibility="no-hide-descendants"><Ionicons name="star" size={28} color="#F5AA00" /></View>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>Thương hiệu và đối tác</Text>
        <Text style={[styles.description, { color: theme.colors.textMuted }]}>Các thương hiệu và dịch vụ được nhiều người dùng quan tâm.</Text>
      </View>
    </View>
    {error ? <View accessibilityRole="alert" style={styles.status}>
      <Text style={{ color: theme.colors.textMuted }}>Không thể tải thương hiệu. Vui lòng thử lại.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tải lại thương hiệu" onPress={load}
        style={({ pressed }) => [styles.retry, { backgroundColor: theme.colors.primarySoft, opacity: pressed ? 0.65 : 1 }]}>
        <Text style={{ color: theme.colors.primary }}>Thử lại</Text>
      </Pressable>
    </View> : null}
    <View accessibilityState={{ busy: loading }}>
      <FeaturedBrandsGrid brands={brands} loading={loading && brands.length === 0} />
      {!loading && !error && brands.length === 0 ? <Text style={[styles.empty, { color: theme.colors.textMuted }]}>Chưa có thương hiệu nổi bật.</Text> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  section: { borderRadius: 18, borderWidth: 1, padding: spacing.lg, gap: spacing.lg },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs }, title: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  description: { fontSize: 14, lineHeight: 21 }, status: { gap: spacing.sm },
  retry: { minHeight: 44, paddingHorizontal: 16, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 10 },
  empty: { fontSize: 14, lineHeight: 21, paddingVertical: spacing.sm },
});
