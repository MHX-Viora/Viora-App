import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, themeCatalog, type AppTheme, type ThemeDefinition, useTheme } from "@/theme";

function ThemePreview({ definition }: { definition: ThemeDefinition }) {
  const previewTheme = definition.theme;
  return (
    <View accessibilityLabel={`Bản xem trước ${definition.name}`} style={[styles.preview, { backgroundColor: previewTheme.colors.background }]}>
      <View style={[styles.previewHeader, { backgroundColor: previewTheme.colors.secondaryBackground }]}>
        <View style={[styles.previewAvatar, { backgroundColor: previewTheme.colors.primary }]} />
        <View style={[styles.previewLine, { backgroundColor: previewTheme.colors.textMuted }]} />
      </View>
      <View style={styles.previewContent}>
        <View style={[styles.previewCard, { backgroundColor: previewTheme.colors.surface, borderColor: previewTheme.colors.border }]}>
          <View style={[styles.previewTitleLine, { backgroundColor: previewTheme.colors.text }]} />
          <View style={[styles.previewBodyLine, { backgroundColor: previewTheme.colors.textMuted }]} />
          <View style={[styles.previewButton, { backgroundColor: previewTheme.colors.primary }]} />
        </View>
      </View>
      <View style={[styles.previewNavigation, { backgroundColor: previewTheme.colors.surfaceElevated }]}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={[styles.previewNavigationDot, { backgroundColor: item === 1 ? previewTheme.colors.primary : previewTheme.colors.textMuted }]} />
        ))}
      </View>
    </View>
  );
}

export function ThemeModeSheet({ onClose, visible }: { onClose: () => void; visible: boolean }) {
  const insets = useSafeAreaInsets();
  const { mode, setMode, theme } = useTheme();
  const themedStyles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal animationType="slide" hardwareAccelerated navigationBarTranslucent onRequestClose={onClose} presentationStyle="overFullScreen" statusBarTranslucent transparent visible={visible}>
      <View style={themedStyles.backdrop}>
        <Pressable accessibilityLabel="Đóng lựa chọn giao diện" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[themedStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={themedStyles.handle} />
          <View style={themedStyles.header}>
            <View>
              <Text style={themedStyles.title}>Giao diện</Text>
              <Text style={themedStyles.subtitle}>Xem trước và chọn phong cách hiển thị</Text>
            </View>
            <Pressable accessibilityLabel="Đóng lựa chọn giao diện" accessibilityRole="button" hitSlop={10} onPress={onClose}>
              <Ionicons color={theme.colors.icon} name="close" size={26} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={themedStyles.optionList} showsVerticalScrollIndicator={false}>
            {themeCatalog.map((definition) => {
              const selected = definition.id === mode;
              return (
                <Pressable
                  accessibilityLabel={`${definition.name}${selected ? ", đang chọn" : ""}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={definition.id}
                  onPress={() => void setMode(definition.id)}
                  style={({ pressed }) => [themedStyles.option, selected && themedStyles.optionSelected, pressed && themedStyles.optionPressed]}
                >
                      <ThemePreview definition={definition} />
                      <View style={themedStyles.optionCopy}>
                        <Text style={themedStyles.optionTitle}>{definition.name}</Text>
                        <Text style={themedStyles.optionDescription}>{definition.description}</Text>
                      </View>
                  <Ionicons color={selected ? theme.colors.primary : theme.colors.textMuted} name={selected ? "checkmark-circle" : "ellipse-outline"} size={24} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  preview: { borderRadius: 10, height: 92, overflow: "hidden", width: 116 },
  previewAvatar: { borderRadius: 5, height: 10, width: 10 },
  previewBodyLine: { borderRadius: 2, height: 3, opacity: 0.5, width: "76%" },
  previewButton: { alignSelf: "flex-end", borderRadius: 4, height: 10, marginTop: 7, width: 28 },
  previewCard: { borderRadius: 6, borderWidth: 1, padding: 7 },
  previewContent: { flex: 1, justifyContent: "center", paddingHorizontal: 9 },
  previewHeader: { alignItems: "center", flexDirection: "row", gap: 5, height: 18, paddingHorizontal: 7 },
  previewLine: { borderRadius: 2, height: 3, opacity: 0.55, width: 26 },
  previewNavigation: { alignItems: "center", flexDirection: "row", gap: 12, height: 16, justifyContent: "center" },
  previewNavigationDot: { borderRadius: 3, height: 5, width: 5 },
  previewTitleLine: { borderRadius: 2, height: 4, marginBottom: 5, width: "52%" },
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: { backgroundColor: theme.colors.overlay, flex: 1, justifyContent: "flex-end" },
  handle: { alignSelf: "center", backgroundColor: theme.colors.divider, borderRadius: 2, height: 4, marginBottom: spacing.md, width: 40 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: spacing.md, paddingHorizontal: spacing.lg },
  option: { alignItems: "center", borderColor: theme.colors.borderSubtle, borderRadius: theme.effects.cardRadius, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 118, padding: spacing.sm },
  optionCopy: { flex: 1 },
  optionDescription: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  optionList: { gap: spacing.sm, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg },
  optionPressed: { backgroundColor: theme.colors.secondaryBackground },
  optionSelected: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  optionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "800" },
  sheet: { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border, borderTopLeftRadius: theme.effects.cardRadius, borderTopRightRadius: theme.effects.cardRadius, borderWidth: 1, maxHeight: "88%", paddingTop: spacing.sm },
  subtitle: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
});
