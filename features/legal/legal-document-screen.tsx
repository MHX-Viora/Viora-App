import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MarkdownContent } from "@/features/legal/markdown-content";
import { getLegalDocument } from "@/services/legal.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { LegalDocument } from "@/types/legal";
import { LegalDocumentType } from "@/types/legal";

export function LegalDocumentScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setDocument(await getLegalDocument(Number(type) as LegalDocumentType)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải tài liệu."); }
    finally { setLoading(false); }
  }, [type]);
  useEffect(() => { void load(); }, [load]);
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Pressable accessibilityLabel="Quay lại" accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons color={theme.colors.text} name="chevron-back" size={24} /></Pressable><Text numberOfLines={1} style={styles.title}>{document?.title ?? "Tài liệu pháp lý"}</Text><View style={styles.back} /></View>
    {loading ? <ActivityIndicator color={theme.colors.primary} style={styles.center} /> : error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable></View> : document ? <ScrollView contentContainerStyle={styles.content}><Text style={styles.meta}>Phiên bản {document.version}{document.publishedAt ? ` · Cập nhật ${new Date(document.publishedAt).toLocaleDateString("vi-VN")}` : ""}</Text><MarkdownContent content={document.content} /></ScrollView> : null}
  </SafeAreaView>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: "center", flexDirection: "row", paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, back: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  title: { color: colors.text, flex: 1, fontSize: 18, fontWeight: "800", textAlign: "center" }, center: { alignItems: "center", flex: 1, justifyContent: "center", padding: spacing.lg }, error: { color: colors.textMuted, textAlign: "center" },
  retry: { backgroundColor: colors.primary, borderRadius: 8, marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }, retryText: { color: colors.primaryContrast, fontWeight: "700" }, content: { padding: spacing.md, paddingBottom: spacing.xl }, meta: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
});
