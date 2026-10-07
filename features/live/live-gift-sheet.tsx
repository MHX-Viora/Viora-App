import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { invalidateWalletData } from "@/services/wallet.service";
import { formatVnd } from "@/utils/wallet-format";
import { formatGiftPrice, sendSingleGift } from "./live-gift-payment";
import { getLiveGifts, LiveApiError, type LiveGift } from "@/services/live.service";
import { isValidGiftPrice } from "@/services/live-gift-catalog";
import { filterGiftCategory, giftCategories, type GiftCategory } from "./live-gift-category";

const PINK = "#FF347B";

export function LiveGiftSheet({ visible, onClose, balance, onSendGift, inline = false }: { visible: boolean; onClose: () => void; balance: number | null; onSendGift?: (gift: LiveGift, quantity: number) => Promise<void>; inline?: boolean }) {
  const { width } = useWindowDimensions();
  const columns = inline || width < 360 ? 3 : 4;
  const [sheetWidth, setSheetWidth] = useState(0);
  const [category, setCategory] = useState<GiftCategory>("POPULAR");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState("");
  const submitGift = async (gift: LiveGift) => {
    if (!onSendGift || pendingRef.current) return;
    setPending(true); setError("");
    try { await sendSingleGift(gift, balance, pendingRef, onSendGift); }
    catch (failure) {
      setError(failure instanceof Error ? failure.message : "Vui lòng thử lại.");
      if (failure instanceof LiveApiError && failure.code === "LIVE_GIFT_PRICE_CHANGED") {
        void loadCatalog();
      }
      invalidateWalletData();
    } finally { setPending(false); }
  };
  useEffect(() => { if (!visible) setError(""); }, [visible]);
  const [catalog, setCatalog] = useState<LiveGift[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const catalogRequest = useRef(0);
  const loadCatalog = useCallback(async () => {
    const requestId = ++catalogRequest.current;
    setCatalogLoading(true); setCatalogError(false);
    if (__DEV__) console.debug("[Gift] loading catalog");
    try {
      const gifts = await getLiveGifts();
      if (requestId === catalogRequest.current) setCatalog(gifts);
    } catch (failure) {
      console.error("[Gift] catalog failed", failure);
      if (requestId === catalogRequest.current) { setCatalog([]); setCatalogError(true); }
    } finally {
      if (requestId === catalogRequest.current) setCatalogLoading(false);
    }
  }, []);
  useEffect(() => {
    if (visible) void loadCatalog();
    return () => { catalogRequest.current += 1; };
  }, [visible, loadCatalog]);
  const gifts = useMemo(() => filterGiftCategory(catalog, category).sort((a, b) =>
    (isValidGiftPrice(a.price) ? a.price : Infinity) - (isValidGiftPrice(b.price) ? b.price : Infinity)
  ), [catalog, category]);
  useEffect(() => {
    if (visible && __DEV__) {
      console.debug("[Gift] selected category:", category);
      console.debug("[Gift] filtered gifts:", gifts);
    }
  }, [category, gifts, visible]);
  const cardWidth = Math.max(56, Math.floor((sheetWidth - 24 - (inline ? 16 : 0)) / columns) - 6);
  const openWallet = () => { onClose(); router.push("/wallet/deposit"); };

  const sheet = <SafeAreaView edges={inline ? [] : ["bottom"]} onLayout={(event) => setSheetWidth(event.nativeEvent.layout.width)} style={[styles.sheet, inline && styles.inlineSheet, inline && { height: 350 }]}>
        {!inline ? <View style={styles.handle} /> : null}
        <View style={[styles.header, inline && styles.inlineHeader]}>
          <Text style={[styles.title, inline && styles.inlineTitle]}>🎁 Quà tặng</Text>
          <Pressable accessibilityLabel="Mở ví ANKT" accessibilityRole="button" onPress={openWallet} style={styles.balance}>
            <Ionicons color="#F4C469" name="wallet-outline" size={inline ? 17 : 21} />
            <Text style={[styles.balanceText, inline && styles.inlineBalanceText]}>{balance === null ? "—" : formatVnd(balance)}</Text>
            <Ionicons color="#9BAABD" name="chevron-forward" size={inline ? 13 : 16} />
          </Pressable>
          {inline ? <Pressable accessibilityLabel="Đóng bảng quà tặng" accessibilityRole="button" onPress={onClose} style={styles.closeButton}><Ionicons color="#FFFFFF" name="close" size={19} /></Pressable> : null}
        </View>
        <View style={[styles.categories, inline && styles.inlineCategories]}>{giftCategories.map((item) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: category === item.id }} key={item.id} onPress={() => setCategory(item.id)} style={[styles.category, inline && styles.inlineCategory, category === item.id && styles.activeCategory]}><Text style={[styles.categoryText, category === item.id && styles.activeCategoryText]}>{item.label}</Text></Pressable>)}</View>
        <ScrollView contentContainerStyle={styles.grid} nestedScrollEnabled showsVerticalScrollIndicator={!inline} style={inline ? styles.inlineList : styles.list}>
          {catalogLoading ? <View style={styles.catalogState}><ActivityIndicator color={PINK} /><Text style={styles.catalogMessage}>Đang tải quà tặng…</Text></View> : catalogError ? <View style={styles.catalogState}><Text accessibilityRole="alert" style={styles.catalogMessage}>Không thể tải danh sách quà</Text><Pressable accessibilityRole="button" onPress={() => void loadCatalog()} style={styles.retryButton}><Text style={styles.cardSendText}>Thử lại</Text></Pressable></View> : gifts.length === 0 ? <View style={styles.catalogState}><Text style={styles.catalogMessage}>Chưa có quà trong danh mục này</Text></View> : gifts.map((item) => <GiftCard gift={item} width={cardWidth} key={item.id} selected={selectedId === item.id} pending={pending && selectedId === item.id} canSend={Boolean(onSendGift) && isValidGiftPrice(item.price) && !pending && !catalogLoading} onPress={() => { if (!pendingRef.current) { setSelectedId((current) => current === item.id ? null : item.id); setError(""); } }} onSend={() => void submitGift(item)} />)}
        </ScrollView>
        {error ? <Text accessibilityRole="alert" style={styles.sendError}>{error}</Text> : null}
      </SafeAreaView>;

  if (inline) return visible ? sheet : null;

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
    <View style={styles.overlay}>
      <Pressable accessibilityLabel="Đóng bảng quà tặng" onPress={onClose} style={styles.backdrop} />
      {sheet}
    </View>
  </Modal>;
}

const GiftCard = memo(function GiftCard({ gift, width, selected, pending, canSend, onPress, onSend }: { gift: LiveGift; width: number; selected: boolean; pending: boolean; canSend: boolean; onPress: () => void; onSend: () => void }) {
  return <View style={[styles.card, { width }, selected && styles.selectedCard]}><Pressable accessibilityLabel={`Chọn ${gift.name}, ${isValidGiftPrice(gift.price) ? formatVnd(gift.price) : "Chưa có giá VNĐ"}`} accessibilityRole="button" onPress={onPress} style={styles.cardContent}><Image contentFit="contain" source={{ uri: gift.imageUrl }} style={{ width: 34, height: 34 }} /><Text numberOfLines={2} style={styles.giftName}>{gift.name}</Text><Text style={styles.price}>{formatGiftPrice(gift.price)}</Text></Pressable>{selected ? <Pressable accessibilityLabel={`Gửi ${gift.name}`} accessibilityRole="button" accessibilityState={{ disabled: !canSend, busy: pending }} disabled={!canSend} onPress={onSend} style={[styles.cardSend, !canSend && styles.cardSendDisabled]}><Text style={styles.cardSendText}>{pending ? "Đang gửi…" : "Gửi"}</Text></Pressable> : null}</View>;
});

const styles = StyleSheet.create({
  catalogState: { alignItems: "center", justifyContent: "center", width: "100%", minHeight: 116, gap: 12, paddingVertical: 20 },
  catalogMessage: { color: "#B2C3D5", fontSize: 13, textAlign: "center" },
  retryButton: { backgroundColor: PINK, borderRadius: 8, minHeight: 44, paddingHorizontal: 20, justifyContent: "center" },
  sendError: { color: "#FFABB9", fontSize: 13, paddingHorizontal: 16, paddingBottom: 12 },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.52)" },
  sheet: { backgroundColor: "#0E1B2A", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "76%", minHeight: 340, overflow: "hidden" },
  inlineSheet: { borderTopColor: "#20384C", borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 1, maxHeight: "100%", minHeight: 0 },
  handle: { alignSelf: "center", backgroundColor: "#5C6A7D", borderRadius: 3, height: 4, marginTop: 10, width: 38 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16 },
  inlineHeader: { paddingHorizontal: 9, paddingTop: 6 },
  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  inlineTitle: { fontSize: 14 },
  balance: { alignItems: "center", flexDirection: "row", gap: 5, minHeight: 44 },
  balanceText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  inlineBalanceText: { fontSize: 10 },
  closeButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  categories: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  inlineCategories: { gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  category: { borderColor: "#344658", borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  inlineCategory: { paddingHorizontal: 9, paddingVertical: 6 },
  activeCategory: { backgroundColor: PINK, borderColor: PINK },
  categoryText: { color: "#AAB9CA", fontSize: 12, fontWeight: "700" },
  activeCategoryText: { color: "#FFFFFF" },
  list: { flexGrow: 0, flexShrink: 1 },
  inlineList: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingBottom: 10, paddingHorizontal: 12, width: "100%" },
  card: { alignItems: "center", borderColor: "transparent", borderRadius: 12, borderWidth: 1, margin: 3, minHeight: 116, overflow: "hidden", paddingTop: 6 },
  cardContent: { alignItems: "center", flex: 1, justifyContent: "center", width: "100%" },
  cardSend: { alignItems: "center", backgroundColor: PINK, justifyContent: "center", minHeight: 26, width: "100%" },
  cardSendDisabled: { opacity: 0.62 },
  cardSendText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  selectedCard: { backgroundColor: "rgba(255, 52, 123, 0.15)", borderColor: PINK },
  emoji: { fontSize: 31 },
  giftName: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", minHeight: 30, textAlign: "center" },
  price: { color: "#B2C3D5", fontSize: 10 },
});
