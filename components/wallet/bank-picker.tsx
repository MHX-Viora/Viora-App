import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getWalletBanks, type WalletBank } from "@/services/wallet.service";
import { useTheme } from "@/theme";

export function BankPicker({ selected, onSelect, disabled }: { selected: WalletBank | null; onSelect: (bank: WalletBank) => void; disabled: boolean }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [banks, setBanks] = useState<WalletBank[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError(false);
    void getWalletBanks().then((items) => { if (active) setBanks(items); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, attempt]);
  const filtered = useMemo(() => {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
    return banks.filter((bank) => normalize(`${bank.name} ${bank.shortName} ${bank.code}`).includes(normalize(search.trim())));
  }, [banks, search]);
  const styles = useMemo(() => StyleSheet.create({
    button: { alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 48, flexDirection: "row", gap: 12 },
    text: { color: colors.text, fontSize: 14 }, muted: { color: colors.textMuted, fontSize: 12 }, label: { color: colors.text, fontWeight: "700", marginBottom: 8 },
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 20 },
    panel: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, width: "100%", maxWidth: 560, maxHeight: "85%", alignSelf: "center", gap: 16 },
    input: { color: colors.text, backgroundColor: colors.input, borderRadius: 10, borderColor: colors.border, borderWidth: 1, minHeight: 48, padding: 12 },
    logo: { height: 32, width: 64 }, row: { flexDirection: "row", alignItems: "center", minHeight: 64, gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }, copy: { flex: 1 }, list: { flexGrow: 0 },
  }), [colors]);
  return <View><Text style={styles.label}>Ngân hàng</Text><Pressable accessibilityRole="button" accessibilityLabel="Chọn ngân hàng" disabled={disabled} onPress={() => setOpen(true)} style={styles.button}>{selected && <Image source={{ uri: selected.logo }} contentFit="contain" style={styles.logo} />}<Text style={styles.text}>{selected?.shortName ?? "Chọn ngân hàng nhận tiền"}</Text></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><View style={styles.overlay}><View accessibilityViewIsModal style={styles.panel}><Text style={styles.label}>Chọn ngân hàng</Text><TextInput accessibilityLabel="Tìm ngân hàng" autoFocus value={search} onChangeText={setSearch} placeholder="Tìm theo tên hoặc tên viết tắt" placeholderTextColor={colors.placeholder} style={styles.input} />{loading ? <ActivityIndicator color={colors.primary} /> : error ? <View><Text accessibilityRole="alert" style={styles.text}>Không tải được danh sách ngân hàng.</Text><Pressable accessibilityRole="button" style={styles.button} onPress={() => setAttempt((value) => value + 1)}><Text style={styles.text}>Thử lại</Text></Pressable></View> : <FlatList style={styles.list} keyboardShouldPersistTaps="handled" data={filtered} keyExtractor={(bank) => bank.code} ListEmptyComponent={<Text style={styles.muted}>Không tìm thấy ngân hàng.</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.shortName}, ${item.name}`} style={styles.row} onPress={() => { onSelect(item); setOpen(false); setSearch(""); }}><Image source={{ uri: item.logo }} contentFit="contain" style={styles.logo} /><View style={styles.copy}><Text style={styles.label}>{item.shortName}</Text><Text style={styles.muted}>{item.name}</Text></View></Pressable>} />}<Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.button}><Text style={styles.text}>Đóng</Text></Pressable></View></View></Modal>
  </View>;
}
