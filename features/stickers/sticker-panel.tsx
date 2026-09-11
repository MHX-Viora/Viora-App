import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

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
import type { Sticker, StickerPack, StickerPackDetail } from "@/types/sticker";
import { getRecentStickers } from "./recent-sticker-storage";

type Props = {
  onSelect: (sticker: Sticker) => void;
  onOpenStore: () => void;
};

const USABLE_PACKS_KEY = stickerPackPageKey("usable", 1, 50);

export function StickerPanel({ onSelect, onOpenStore }: Props) {
  const { theme } = useTheme();
  const { isWeb } = useResponsive();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [packs, setPacks] = useState<StickerPack[]>(
    () => getStickerPackPageCache(USABLE_PACKS_KEY)?.value.items ?? [],
  );
  const [selectedPackId, setSelectedPackId] = useState("recent");
  const [detail, setDetail] = useState<StickerPackDetail | null>(null);
  const [recent, setRecent] = useState<Sticker[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [packsLoading, setPacksLoading] = useState(
    () => !getStickerPackPageCache(USABLE_PACKS_KEY),
  );
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await hydrateStickerCache();
        const [cached, stored] = [
          getStickerPackPageCache(USABLE_PACKS_KEY),
          await getRecentStickers(),
        ];
        if (!active) return;
        if (cached) setPacks(cached.value.items);
        setRecent(stored);
        setPacksLoading(false);
        if (!isStickerCacheStale(cached)) return;

        const page = await getStickerPacks("usable");
        setStickerPackPageCache(USABLE_PACKS_KEY, page);
        if (active) setPacks(page.items);
      } catch (reason: unknown) {
        if (active && getStickerPackPageCache(USABLE_PACKS_KEY) === undefined) {
          setError(reason instanceof Error ? reason.message : "Không thể tải nhãn dán.");
        }
      } finally {
        if (active) setPacksLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedPackId === "recent") {
      setDetail(null);
      void getRecentStickers().then(setRecent);
      return;
    }
    let active = true;
    void (async () => {
      try {
        await hydrateStickerCache();
        const cached = getStickerPackDetailCache(selectedPackId);
        if (!active) return;
        setDetail(cached?.value ?? null);
        setDetailLoading(!cached);
        setError("");
        if (!isStickerCacheStale(cached)) return;

        const value = await getStickerPack(selectedPackId);
        setStickerPackDetailCache(selectedPackId, value);
        if (active) setDetail(value);
      } catch (reason: unknown) {
        if (active && getStickerPackDetailCache(selectedPackId) === undefined) {
          setError(reason instanceof Error ? reason.message : "Không thể tải bộ nhãn dán.");
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedPackId]);

  const stickers = (selectedPackId === "recent" ? recent : detail?.stickers ?? [])
    .filter((sticker) => sticker.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const loading = selectedPackId === "recent"
    ? packsLoading && packs.length === 0 && recent.length === 0
    : detailLoading && detail === null;

  return (
    <View accessibilityLabel="Bảng nhãn dán" style={[styles.panel, isWeb && styles.webPanel]}>
      <View style={[styles.searchRow, isWeb && styles.webSearchRow]}>
        <Ionicons color={theme.colors.textMuted} name="search" size={18} />
        <TextInput
          accessibilityLabel="Tìm nhãn dán"
          onChangeText={setQuery}
          placeholder="Tìm nhãn dán"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.searchInput, isWeb && styles.webSearchInput]}
          value={query}
        />
      </View>
      <ScrollView contentContainerStyle={[styles.tabs, isWeb && styles.webTabs]} horizontal showsHorizontalScrollIndicator={false}>
        <Pressable accessibilityLabel="Nhãn dán gần đây" onPress={() => setSelectedPackId("recent")} style={[styles.tab, isWeb && styles.webTab, selectedPackId === "recent" && styles.activeTab]}>
          <Ionicons color={selectedPackId === "recent" ? theme.colors.primary : theme.colors.textMuted} name="time-outline" size={isWeb ? 20 : 22} />
        </Pressable>
        {packs.map((pack) => (
          <Pressable accessibilityLabel={pack.name} key={pack.id} onPress={() => setSelectedPackId(pack.id)} style={[styles.tab, isWeb && styles.webTab, selectedPackId === pack.id && styles.activeTab]}>
            <Image cachePolicy="memory-disk" contentFit="contain" source={{ uri: pack.thumbnailUrl }} style={[styles.packIcon, isWeb && styles.webPackIcon]} />
          </Pressable>
        ))}
        <Pressable accessibilityLabel="Mở cửa hàng nhãn dán" onPress={onOpenStore} style={[styles.tab, isWeb && styles.webTab]}>
          <Ionicons color={theme.colors.primary} name="add" size={isWeb ? 22 : 24} />
        </Pressable>
      </ScrollView>
      {loading ? <ActivityIndicator color={theme.colors.primary} style={styles.state} /> : error && stickers.length === 0 ? <Text style={styles.error}>{error}</Text> : stickers.length === 0 ? <Text style={styles.empty}>Chưa có nhãn dán.</Text> : (
        <ScrollView contentContainerStyle={[styles.grid, isWeb && styles.webGrid]} keyboardShouldPersistTaps="handled">
          {stickers.map((sticker) => (
            <Pressable accessibilityLabel={`Gửi nhãn dán ${sticker.name}`} key={sticker.id} onPress={() => onSelect(sticker)} style={[styles.stickerButton, isWeb && styles.webStickerButton]}>
              <Image cachePolicy="memory-disk" contentFit="contain" source={{ uri: sticker.thumbnailUrl ?? sticker.imageUrl }} style={[styles.sticker, isWeb && styles.webSticker]} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  activeTab: { borderBottomColor: colors.primary },
  empty: { color: colors.textMuted, padding: spacing.lg, textAlign: "center" },
  error: { color: colors.danger, padding: spacing.md, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: spacing.sm },
  packIcon: { height: 28, width: 28 },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, maxHeight: 360, overflow: "hidden" },
  searchInput: { color: colors.text, flex: 1, minHeight: 38 },
  searchRow: { alignItems: "center", borderBottomColor: colors.borderSubtle, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md },
  state: { padding: spacing.lg },
  sticker: { height: 72, width: "100%" },
  stickerButton: { alignItems: "center", justifyContent: "center", padding: spacing.xs, width: "25%" },
  tab: { alignItems: "center", borderBottomColor: "transparent", borderBottomWidth: 2, justifyContent: "center", minHeight: 44, minWidth: 48 },
  tabs: { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1, paddingHorizontal: spacing.xs },
  webGrid: { padding: spacing.xs },
  webPackIcon: { height: 24, width: 24 },
  webPanel: { maxHeight: 300 },
  webSearchInput: { minHeight: 34, paddingVertical: 0 },
  webSearchRow: { paddingHorizontal: spacing.sm },
  webSticker: { height: 56, width: 56 },
  webStickerButton: { padding: spacing.xs, width: 64 },
  webTab: { minHeight: 40, minWidth: 40 },
  webTabs: { paddingHorizontal: 0 },
});
