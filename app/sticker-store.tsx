import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getResponsiveDialogLayout } from "@/components/layout/responsive-layout";
import { chatLocalRepository } from "@/data/chat-local/chat-local-repository";
import { useResponsive } from "@/hooks/use-responsive";
import { getStickerPack, getStickerPacks } from "@/services/sticker.service";
import {
  getStickerPackDetailCache,
  getStickerPackPageCache,
  hydrateStickerCache,
  isStickerCacheStale,
  setStickerPackDetailCache,
  setStickerPackPageCache,
  stickerPackPageKey,
} from "@/stores/sticker-cache";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import { getUser } from "@/stores/session-store";
import { breakpoints } from "@/theme/breakpoints";
import type { StickerPack, StickerPackDetail } from "@/types/sticker";

const FILTERS = [
  ["featured", "Nổi bật"], ["free", "Miễn phí"], ["paid", "Có phí"], ["owned", "Của tôi"],
] as const;

export default function StickerStoreScreen() {
  const { theme } = useTheme();
  const { height: viewportHeight, isDesktopWeb, width: viewportWidth } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const dialogLayout = getResponsiveDialogLayout({ isDesktopWeb, maxWidth: 720 });
  const columnCount = viewportWidth >= breakpoints.largeDesktop ? 6 : viewportWidth >= breakpoints.tablet ? 4 : 3;
  const cardCellWidth = `${100 / columnCount}%` as `${number}%`;
  const previewGridMaxHeight = Math.max(120, Math.min(360, viewportHeight * 0.48));
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("featured");
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<StickerPackDetail | null>(null);
  const previewPackIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const cacheKey = stickerPackPageKey(filter, 1, 50);
      try {
        const ownerId = (await getUser())?.id;
        await hydrateStickerCache(chatLocalRepository, ownerId, {
          pageKeys: [cacheKey],
        });
        const cached = getStickerPackPageCache(cacheKey);
        if (!active) return;
        setPacks(cached?.value.items ?? []);
        setLoading(!cached);
        setError("");
        if (!isStickerCacheStale(cached)) return;

        const page = await getStickerPacks(filter);
        setStickerPackPageCache(cacheKey, page);
        if (active) setPacks(page.items);
      } catch (reason: unknown) {
        if (active && getStickerPackPageCache(cacheKey) === undefined) {
          setError(reason instanceof Error ? reason.message : "Không thể tải cửa hàng.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [filter]);

  const openPreview = async (packId: string) => {
    previewPackIdRef.current = packId;
    const ownerId = (await getUser())?.id;
    await hydrateStickerCache(chatLocalRepository, ownerId, {
      detailIds: [packId],
    });
    if (previewPackIdRef.current !== packId) return;
    const cached = getStickerPackDetailCache(packId);
    if (cached) setPreview(cached.value);
    if (!isStickerCacheStale(cached)) return;
    try {
      const value = await getStickerPack(packId);
      setStickerPackDetailCache(packId, value);
      if (previewPackIdRef.current === packId) setPreview(value);
    } catch (reason: unknown) {
      if (!cached && previewPackIdRef.current === packId) {
        setError(reason instanceof Error ? reason.message : "Không thể tải bộ nhãn dán.");
      }
    }
  };

  const closePreview = () => {
    previewPackIdRef.current = null;
    setPreview(null);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><Pressable accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons color={theme.colors.text} name="arrow-back" size={24} /></Pressable><Text style={styles.title}>Nhãn dán</Text></View>
      <View style={styles.filters}>{FILTERS.map(([value, label]) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.activeFilter]}><Text style={[styles.filterText, filter === value && styles.activeFilterText]}>{label}</Text></Pressable>)}</View>
      {loading ? <ActivityIndicator color={theme.colors.primary} style={styles.state} /> : error ? <Text style={styles.error}>{error}</Text> : (
        <FlatList
          contentContainerStyle={styles.list}
          data={packs}
          key={`sticker-grid-${columnCount}`}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có bộ nhãn dán trong mục này.</Text>}
          numColumns={columnCount}
          renderItem={({ item }) => (
            <View style={[styles.cardCell, { width: cardCellWidth }]}>
              <Pressable accessibilityLabel={`Xem bộ ${item.name}`} onPress={() => void openPreview(item.id)} style={styles.card}>
                <Image cachePolicy="memory-disk" contentFit="contain" source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
                <Text numberOfLines={2} style={styles.packName}>{item.name}</Text>
                <Text style={styles.meta}>{item.stickerCount} nhãn dán</Text>
                <Text style={styles.price}>{item.isOwned ? "Đã sở hữu" : item.isFree ? "Miễn phí" : `${item.price.toLocaleString("vi-VN")} xu`}</Text>
              </Pressable>
            </View>
          )}
        />
      )}
      <Modal animationType="slide" onRequestClose={closePreview} transparent visible={preview !== null}>
        <View style={[styles.scrim, dialogLayout.backdrop]}>
          <Pressable accessibilityLabel="Đóng xem trước" onPress={closePreview} style={StyleSheet.absoluteFill} />
          <View style={[styles.preview, dialogLayout.surface]}>
            <View style={styles.previewHeader}><Text style={styles.title}>{preview?.pack.name}</Text><Pressable accessibilityLabel="Đóng xem trước" onPress={closePreview}><Ionicons color={theme.colors.text} name="close" size={24} /></Pressable></View>
            <FlatList
              contentContainerStyle={[styles.previewGrid, isDesktopWeb && styles.desktopPreviewGrid]}
              data={preview?.stickers ?? []}
              keyExtractor={(sticker) => sticker.id}
              nestedScrollEnabled
              numColumns={4}
              renderItem={({ item: sticker }) => (
                <View style={styles.previewStickerCell}>
                  <Image
                    cachePolicy="memory-disk"
                    contentFit="contain"
                    source={{ uri: sticker.thumbnailUrl ?? sticker.imageUrl }}
                    style={styles.previewSticker}
                  />
                </View>
              )}
              showsVerticalScrollIndicator
              style={[styles.previewList, { maxHeight: previewGridMaxHeight }]}
            />
            <Text style={styles.meta}>{preview?.pack.stickerCount} nhãn dán</Text>
            <Text style={styles.price}>{preview?.canUse ? "Bạn có thể sử dụng bộ này" : `${preview?.pack.price.toLocaleString("vi-VN")} xu`}</Text>
            {!preview?.canUse ? <Pressable accessibilityState={{ disabled: true }} disabled style={styles.disabledPurchase}><Text style={styles.disabledPurchaseText}>Chưa kết nối ví ANKT</Text></Pressable> : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  activeFilter: { borderBottomColor: colors.primary }, activeFilterText: { color: colors.primary },
  card: { backgroundColor: colors.card, borderColor: colors.borderSubtle, borderRadius: 10, borderWidth: 1, margin: spacing.xs, padding: spacing.sm }, cardCell: { flexGrow: 0, flexShrink: 0 },
  empty: { color: colors.textMuted, padding: spacing.xl, textAlign: "center" }, error: { color: colors.danger, padding: spacing.lg, textAlign: "center" },
  filter: { borderBottomColor: "transparent", borderBottomWidth: 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, filterText: { color: colors.textMuted, fontWeight: "600" }, filters: { borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-around" },
  header: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.md }, list: { padding: spacing.sm }, meta: { color: colors.textMuted, fontSize: 12 }, packName: { color: colors.text, fontWeight: "700", marginTop: spacing.sm }, price: { color: colors.primary, fontWeight: "700", marginTop: spacing.xs }, screen: { backgroundColor: colors.background, flex: 1 }, state: { marginTop: spacing.xl }, thumbnail: { aspectRatio: 1, borderRadius: 8, width: "100%" }, title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  disabledPurchase: { alignItems: "center", backgroundColor: colors.surfaceElevated, borderRadius: 8, marginTop: spacing.md, padding: spacing.md }, disabledPurchaseText: { color: colors.textMuted, fontWeight: "700" }, preview: { backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "82%", overflow: "hidden", padding: spacing.md, width: "100%" }, previewGrid: { paddingVertical: spacing.md }, previewHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, previewList: { flexGrow: 0, flexShrink: 1 }, previewStickerCell: { alignItems: "center", padding: spacing.xs, width: "25%" }, previewSticker: { aspectRatio: 1, maxWidth: 120, width: "100%" }, scrim: { backgroundColor: colors.overlay, flex: 1, justifyContent: "flex-end" },
  desktopPreviewGrid: { paddingVertical: spacing.sm },
});
