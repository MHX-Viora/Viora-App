import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { miniAppCatalogCache } from "@/features/mini-apps/lib/catalog-cache";
import { MiniAppCatalogState } from "@/features/mini-apps/lib/catalog-state";
import { miniAppCatalog } from "@/services/mini-app.service";
import { spacing, useTheme } from "@/theme";
import { MiniAppGrid } from "./mini-app-grid";

export function MiniAppSection({ onOpen }: { onOpen: (appId: string) => void }) {
  const { theme } = useTheme(); const colors = theme.colors;
  const [catalog] = useState(() => new MiniAppCatalogState(miniAppCatalog, miniAppCatalogCache));
  const state = useSyncExternalStore(catalog.subscribe, catalog.snapshot, catalog.snapshot);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true; void catalog.refresh();
    return () => { focused.current = false; catalog.stop(); };
  }, [catalog]));
  useEffect(() => {
    const refresh = () => { if (focused.current) void catalog.refresh(); };
    const subscription = AppState.addEventListener("change", status => { if (status === "active") refresh(); else catalog.stop(); });
    if (Platform.OS === "web") window.addEventListener("online", refresh);
    return () => { subscription.remove(); if (Platform.OS === "web") window.removeEventListener("online", refresh); catalog.stop(); };
  }, [catalog]);
  const button = (label: string, action: () => void) => <Pressable accessibilityRole="button" onPress={action}
    style={({ pressed }) => [styles.action, { backgroundColor: colors.primarySoft, opacity: pressed ? 0.65 : 1 }]}>
    <Text style={[styles.actionText, { color: colors.primary }]}>{label}</Text>
  </Pressable>;
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <View style={styles.heading}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.headingIcon}>
          {[0, 1, 2, 3].map(cell => <View key={cell} style={styles.headingIconCell} />)}
        </View>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Mini App</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>Khám phá các tiện ích dành cho bạn.</Text>
        </View>
      </View>
      <View accessibilityLiveRegion="polite" accessibilityState={{ busy: state.loading }}>
        {state.error ? <View style={styles.status}>
          <Text style={[styles.message, { color: colors.textMuted }]}>{state.error}</Text>
          {button("Thử lại", () => { void catalog.refresh(); })}
        </View> : !state.loading && state.items.length === 0 ?
          <Text style={[styles.empty, { color: colors.textMuted }]}>Chưa có Mini App khả dụng</Text> : null}
        <MiniAppGrid items={state.items} onOpen={onOpen} loading={state.loading && state.items.length === 0} />
        {state.loading && state.items.length > 0 ? <ActivityIndicator accessibilityLabel="Đang tải Mini App" color={colors.primary} /> : null}
        {!state.loading && !state.error && state.page * 20 < state.total ? button("Xem thêm", () => { void catalog.more(); }) : null}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  section: { borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  heading: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.sm },
  headingIcon: { width: 28, height: 28, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  headingIconCell: { width: 12, height: 12, borderRadius: 3, backgroundColor: "#008CFF" },
  headingCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { fontSize: 20, fontWeight: "700", lineHeight: 28 },
  description: { fontSize: 14, lineHeight: 21 },
  status: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  message: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  empty: { fontSize: 14, lineHeight: 21, paddingVertical: spacing.xl, textAlign: "center" },
  action: { alignItems: "center", alignSelf: "center", borderRadius: 12, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  actionText: { fontSize: 14, fontWeight: "600" },
});
