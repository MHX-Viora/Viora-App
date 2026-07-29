import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listLegalDocuments } from "@/services/legal.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { LegalDocumentSummary } from "@/types/legal";

export function LegalDocumentsMenuScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [documents, setDocuments] = useState<LegalDocumentSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDocuments(await listLegalDocuments());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách tài liệu.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Quay lại" accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Chính sách và điều khoản</Text>
        <View style={styles.iconButton} />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.center} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.message}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="document-text-outline" size={42} />
          <Text style={styles.message}>Chưa có tài liệu nào được công bố.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {documents.map((document) => (
            <Pressable
              accessibilityHint={`Phiên bản ${document.version}`}
              accessibilityRole="button"
              key={document.id}
              onPress={() => router.push(`/legal/${document.type}` as Href)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.copy}>
                <Text style={styles.title}>{document.title}</Text>
                <Text style={styles.summary} numberOfLines={2}>
                  {document.summary || `Phiên bản ${document.version}`}
                </Text>
              </View>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: "800", textAlign: "center" },
  iconButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  center: { alignItems: "center", flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.lg },
  message: { color: colors.textMuted, lineHeight: 20, textAlign: "center" },
  retry: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.primaryContrast, fontWeight: "700" },
  content: { gap: spacing.sm, padding: spacing.md },
  row: { alignItems: "center", backgroundColor: colors.surfaceElevated, borderColor: colors.visuals.rgb_152_80_232_0_56, borderRadius: 14, borderWidth: 1, flexDirection: "row", minHeight: 76, padding: spacing.md },
  pressed: { opacity: 0.72 },
  copy: { flex: 1, gap: 4, paddingRight: spacing.md },
  title: { color: colors.text, fontSize: 16, fontWeight: "800" },
  summary: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
