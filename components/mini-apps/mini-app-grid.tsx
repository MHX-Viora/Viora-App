import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import type { MiniAppItem } from "@/features/mini-apps/lib/contracts";
import { miniAppGridLayout } from "@/features/mini-apps/lib/grid-layout";
import { spacing, useTheme } from "@/theme";

function MiniAppLogo({ item }: { item: MiniAppItem }) {
  const { theme } = useTheme(); const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.logo, { backgroundColor: theme.colors.primarySoft }]}>
      {item.logoUrl && !failed ? <Image accessibilityIgnoresInvertColors source={{ uri: item.logoUrl }}
        style={styles.logo} resizeMode="cover" onError={() => setFailed(true)} /> :
        <Text style={[styles.initial, { color: theme.colors.primary }]}>{Array.from(item.name.trim())[0]?.toLocaleUpperCase() ?? "A"}</Text>}
    </View>
  );
}

export function MiniAppGrid({ items, onOpen, loading = false }: {
  items: MiniAppItem[]; onOpen: (appId: string) => void; loading?: boolean;
}) {
  const { theme } = useTheme(); const { fontScale } = useWindowDimensions(); const [width, setWidth] = useState(0);
  const layout = useMemo(() => miniAppGridLayout(width, fontScale), [width, fontScale]);
  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.grid, { gap: layout.gap }]}>
      {width > 0 && (loading ? Array.from({ length: layout.columns * 2 }, (_, i) =>
        <View key={i} accessible={false} style={[styles.cell, { width: layout.cellWidth }]}>
          <View style={[styles.logo, { backgroundColor: theme.colors.secondaryBackground }]} />
          <View style={[styles.skeletonName, { backgroundColor: theme.colors.secondaryBackground }]} />
        </View>) : items.map(item =>
        <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Mở ${item.name}`}
          onPress={() => onOpen(item.id)} style={({ pressed }) => [styles.cell, { width: layout.cellWidth, opacity: pressed ? 0.65 : 1 }]}>
          <MiniAppLogo key={item.logoUrl ?? item.id} item={item} />
          <Text numberOfLines={2} style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
        </Pressable>))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", width: "100%" },
  cell: { alignItems: "center", gap: spacing.sm, minHeight: 112, paddingVertical: spacing.sm },
  logo: { alignItems: "center", borderRadius: 16, height: 56, justifyContent: "center", overflow: "hidden", width: 56 },
  initial: { fontSize: 24, fontWeight: "700" },
  name: { fontSize: 13, fontWeight: "600", lineHeight: 19, textAlign: "center", width: "100%" },
  skeletonName: { borderRadius: 4, height: 14, marginTop: 4, width: "70%" },
});
