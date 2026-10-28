import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import type { FeaturedBrand } from '@/types/featured-brand';

export function FeaturedBrandsGrid({ brands, loading = false }: { brands: FeaturedBrand[]; loading?: boolean }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const columns = width >= 640 ? 4 : 2;
  const tileWidth = width ? (width - 12 * (columns - 1)) / columns : '47%';
  return <View testID="featured-brands-grid" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.grid}>
    {loading ? [0, 1, 2, 3].map(key => <View key={key} testID="brand-skeleton" style={[styles.tile, { width: tileWidth, backgroundColor: theme.colors.secondaryBackground }]} />) :
      brands.filter(brand => !failed.includes(brand.logoUrl)).map(brand => <View key={brand.id} testID="featured-brand-logo"
        style={[styles.tile, { width: tileWidth, backgroundColor: theme.colors.card, borderColor: theme.colors.borderSubtle }]}>
        <Image accessibilityLabel={brand.name} accessible accessibilityRole="image" source={{ uri: brand.logoUrl }} resizeMode="contain"
          onError={() => setFailed(value => [...value, brand.logoUrl])} style={styles.logo} />
      </View>)}
  </View>;
}

const styles = StyleSheet.create({
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { height: 112, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
});
