import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getStickerPack, getStickerPacks } from "@/services/sticker.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { StickerPack, StickerPackDetail } from "@/types/sticker";

const FILTERS = [
  ["featured", "Nổi bật"], ["free", "Miễn phí"], ["paid", "Có phí"], ["owned", "Của tôi"],
] as const;

export default function StickerStoreScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("featured");
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<StickerPackDetail | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    getStickerPacks(filter)
      .then((page) => active && setPacks(page.items))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Không thể tải cửa hàng."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filter]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><Pressable accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons color={theme.colors.text} name="arrow-back" size={24} /></Pressable><Text style={styles.title}>Nhãn dán</Text></View>
      <View style={styles.filters}>{FILTERS.map(([value, label]) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.activeFilter]}><Text style={[styles.filterText, filter === value && styles.activeFilterText]}>{label}</Text></Pressable>)}</View>
      {loading ? <ActivityIndicator color={theme.colors.primary} style={styles.state} /> : error ? <Text style={styles.error}>{error}</Text> : (
        <FlatList
          contentContainerStyle={styles.list}
          data={packs}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có bộ nhãn dán trong mục này.</Text>}
          numColumns={2}
          renderItem={({ item }) => <Pressable accessibilityLabel={`Xem bộ ${item.name}`} onPress={() => void getStickerPack(item.id).then(setPreview).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể tải bộ nhãn dán."))} style={styles.card}><Image resizeMode="cover" source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} /><Text numberOfLines={2} style={styles.packName}>{item.name}</Text><Text style={styles.meta}>{item.stickerCount} nhãn dán</Text><Text style={styles.price}>{item.isOwned ? "Đã sở hữu" : item.isFree ? "Miễn phí" : `${item.price.toLocaleString("vi-VN")} xu`}</Text></Pressable>}
        />
      )}
      <Modal animationType="slide" onRequestClose={() => setPreview(null)} transparent visible={preview !== null}>
        <Pressable onPress={() => setPreview(null)} style={styles.scrim}>
          <Pressable onPress={() => undefined} style={styles.preview}>
            <View style={styles.previewHeader}><Text style={styles.title}>{preview?.pack.name}</Text><Pressable accessibilityLabel="Đóng xem trước" onPress={() => setPreview(null)}><Ionicons color={theme.colors.text} name="close" size={24} /></Pressable></View>
            <ScrollView contentContainerStyle={styles.previewGrid}>{preview?.stickers.map((sticker) => <Image key={sticker.id} resizeMode="contain" source={{ uri: sticker.imageUrl }} style={styles.previewSticker} />)}</ScrollView>
            <Text style={styles.meta}>{preview?.pack.stickerCount} nhãn dán</Text>
            <Text style={styles.price}>{preview?.canUse ? "Bạn có thể sử dụng bộ này" : `${preview?.pack.price.toLocaleString("vi-VN")} xu`}</Text>
            {!preview?.canUse ? <Pressable accessibilityState={{ disabled: true }} disabled style={styles.disabledPurchase}><Text style={styles.disabledPurchaseText}>Chưa kết nối ví ANKT</Text></Pressable> : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  activeFilter: { borderBottomColor: colors.primary }, activeFilterText: { color: colors.primary },
  card: { backgroundColor: colors.card, borderColor: colors.borderSubtle, borderRadius: 10, borderWidth: 1, flex: 1, margin: spacing.xs, padding: spacing.sm },
  empty: { color: colors.textMuted, padding: spacing.xl, textAlign: "center" }, error: { color: colors.danger, padding: spacing.lg, textAlign: "center" },
  filter: { borderBottomColor: "transparent", borderBottomWidth: 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, filterText: { color: colors.textMuted, fontWeight: "600" }, filters: { borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-around" },
  header: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.md }, list: { padding: spacing.sm }, meta: { color: colors.textMuted, fontSize: 12 }, packName: { color: colors.text, fontWeight: "700", marginTop: spacing.sm }, price: { color: colors.primary, fontWeight: "700", marginTop: spacing.xs }, screen: { backgroundColor: colors.background, flex: 1 }, state: { marginTop: spacing.xl }, thumbnail: { aspectRatio: 1, borderRadius: 8, width: "100%" }, title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  disabledPurchase: { alignItems: "center", backgroundColor: colors.surfaceElevated, borderRadius: 8, marginTop: spacing.md, padding: spacing.md }, disabledPurchaseText: { color: colors.textMuted, fontWeight: "700" }, preview: { backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "82%", padding: spacing.md, width: "100%" }, previewGrid: { flexDirection: "row", flexWrap: "wrap", paddingVertical: spacing.md }, previewHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, previewSticker: { aspectRatio: 1, width: "25%" }, scrim: { backgroundColor: colors.overlay, flex: 1, justifyContent: "flex-end" },
});
