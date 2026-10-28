import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import type { FeaturedBrand } from '@/types/featured-brand';

export function FeaturedBrandsGrid({ brands, loading = false }: { brands: FeaturedBrand[]; loading?: boolean }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const columns = width >= 640 ? 4 : 3;
  const tileWidth = width ? (width - 12 * (columns - 1)) / columns : '30%' as const;
  const tileStyle = [styles.tile, columns === 3 && styles.compactTile, { width: tileWidth }];
  return <View testID="featured-brands-grid" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.grid}>
    {loading ? [0, 1, 2, 3].map(key => <View key={key} testID="brand-skeleton" style={[tileStyle, { backgroundColor: theme.colors.secondaryBackground }]} />) :
      brands.filter(brand => !failed.includes(brand.logoUrl)).map(brand => <View key={brand.id} testID="featured-brand-logo"
        style={tileStyle}>
        <Image accessibilityLabel={brand.name} accessible accessibilityRole="image" source={{ uri: brand.logoUrl }} resizeMode="contain"
          onError={() => setFailed(value => [...value, brand.logoUrl])} style={styles.logo} />
      </View>)}
  </View>;
}

const styles = StyleSheet.create({
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { height: 112, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  compactTile: { height: 88, padding: 8 },
  logo: { width: '100%', height: '100%' },
});
