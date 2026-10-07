import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { UserAvatar } from "@/components/common/user-avatar";
import { VerifiedBadge } from "@/components/common/verified-badge";
import { formatGiftAmountTotal, sortLiveTopGifters, type LiveTopGifter } from "./live-top-gifters-model";

type Props = { gifters: readonly LiveTopGifter[]; mode: "sidebar" | "mobile" };
export const LiveTopGifters = memo(function LiveTopGifters({ gifters, mode }: Props) {
  const ranked = useMemo(() => sortLiveTopGifters(gifters.filter((gifter) => gifter.totalGiftCount > 0)), [gifters]);
  const [visible, setVisible] = useState(false);
  const isMobile = mode === "mobile";
  const close = () => setVisible(false);

  return <>
    {isMobile ? <Pressable accessibilityLabel="Mở Top người tặng" accessibilityRole="button" onPress={() => setVisible(true)} style={styles.mobileTrigger}><Ionicons color="#F4C469" name="trophy-outline" size={13} /><Text style={styles.mobileTriggerText}>Top người tặng</Text></Pressable> : <FlatList contentContainerStyle={styles.sidebarList} data={ranked} keyExtractor={(item) => item.userId} ListEmptyComponent={<Text style={styles.empty}>Chưa có người tặng quà.</Text>} renderItem={({ item, index }) => <GifterRow gifter={item} rank={index + 1} />} style={styles.sidebarListView} />}

    {isMobile ? <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Đóng bảng xếp hạng" onPress={close} style={styles.backdrop} />
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}><View style={styles.headerTitle}><Ionicons color="#F4C469" name="trophy" size={19} /><Text style={styles.title}>Top người tặng</Text></View><Pressable accessibilityLabel="Đóng bảng xếp hạng" accessibilityRole="button" onPress={close} style={styles.close}><Ionicons color="#FFFFFF" name="close" size={21} /></Pressable></View>
          <FlatList
            contentContainerStyle={styles.modalList}
            data={ranked}
            keyExtractor={(item) => item.userId}
            ListEmptyComponent={<Text style={styles.empty}>Chưa có người tặng quà.</Text>}
            renderItem={({ item, index }) => <GifterRow gifter={item} rank={index + 1} />}
            style={styles.list}
          />
        </SafeAreaView>
      </View>
    </Modal> : null}
  </>;
});

const rankMarkers = ["👑", "🥈", "🥉"];
const avatarBorders = ["#E7C675", "#A9B9C8", "#BD8D72"];

const GifterRow = memo(function GifterRow({ gifter, rank }: { gifter: LiveTopGifter; rank: number }) {
  return <View accessibilityLabel={`Hạng ${rank}, ${gifter.displayName}, ${gifter.totalGiftCount} quà, ${formatGiftAmountTotal(gifter.totalAmount)}`} style={styles.row}>
    <Text style={[styles.rank, rank === 1 && styles.firstRank]}>{rankMarkers[rank - 1] ?? rank}</Text>
    <View style={[styles.avatarFrame, { borderColor: avatarBorders[rank - 1] ?? "#3C5063" }]}><UserAvatar displayName={gifter.displayName} imageUrl={gifter.avatarUrl} size={34} /></View>
    <View style={styles.userInfo}><View style={styles.usernameLine}><Text numberOfLines={1} style={[styles.username, rank === 1 && styles.firstName]}>{gifter.displayName}</Text>{gifter.isVerified ? <VerifiedBadge size={13} /> : null}</View><Text style={styles.giftCount}>{gifter.totalGiftCount} quà</Text></View>
    <Text numberOfLines={1} style={[styles.coinTotal, rank === 1 && styles.firstCoin]}>{formatGiftAmountTotal(gifter.totalAmount)}</Text>
  </View>;
});

const styles = StyleSheet.create({
  sidebarListView: { flex: 1 },
  sidebarList: { paddingBottom: 8, paddingHorizontal: 10, paddingTop: 3 },
  row: { alignItems: "center", borderBottomColor: "rgba(139, 160, 181, 0.13)", borderBottomWidth: 1, flexDirection: "row", gap: 7, minHeight: 58, paddingVertical: 7 },
  rank: { color: "#B8C7D8", fontSize: 17, fontWeight: "800", textAlign: "center", width: 25 },
  firstRank: { color: "#F4C469" },
  avatarFrame: { borderRadius: 21, borderWidth: 1.5, padding: 2 },
  userInfo: { flex: 1, minWidth: 0 },
  usernameLine: { alignItems: "center", flexDirection: "row", gap: 3, minWidth: 0 },
  username: { color: "#E7EFF8", flexShrink: 1, fontSize: 12, fontWeight: "600" },
  firstName: { color: "#FFFFFF" },
  giftCount: { color: "#91A5B9", fontSize: 10, marginTop: 3 },
  coinTotal: { color: "#D8C17D", fontSize: 11, fontWeight: "700", marginLeft: 2, textAlign: "right" },
  firstCoin: { color: "#F4C469" },
  empty: { color: "#91A5B9", fontSize: 12, paddingVertical: 18, textAlign: "center" },
  mobileTrigger: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(9, 17, 30, 0.57)", borderRadius: 12, flexDirection: "row", gap: 5, marginTop: 7, minHeight: 28, paddingHorizontal: 9 },
  mobileTriggerText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.58)" },
  sheet: { alignSelf: "center", backgroundColor: "#0E1B2A", borderColor: "#2D4357", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, maxHeight: "78%", maxWidth: 640, overflow: "hidden", width: "100%" },
  handle: { alignSelf: "center", backgroundColor: "#718094", borderRadius: 3, height: 4, marginTop: 9, width: 36 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  headerTitle: { alignItems: "center", flexDirection: "row", gap: 8 },
  title: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  close: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  list: { flexGrow: 0, flexShrink: 1 },
  modalList: { paddingBottom: 6, paddingHorizontal: 15 },
});
