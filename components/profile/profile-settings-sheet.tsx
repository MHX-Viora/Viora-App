import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

const SETTINGS = [
  { icon: "bookmark-outline", label: "Đã lưu" },
  { icon: "heart-outline", label: "Yêu thích" },
  { icon: "help-circle-outline", label: "Hỗ trợ" },
  { icon: "shield-checkmark-outline", label: "Bảo mật & quyền" },
  { icon: "person-circle-outline", label: "Cài đặt tài khoản" },
  { icon: "document-text-outline", label: "Chính sách & điều khoản" },
] as const;

export function ProfileSettingsSheet({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Đóng menu cài đặt"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Cài đặt và hoạt động</Text>
            <Pressable
              accessibilityLabel="Đóng menu cài đặt"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons color={colors.text} name="close" size={26} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {SETTINGS.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.label}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <Ionicons color={colors.text} name={item.icon} size={23} />
                <Text style={styles.rowText}>{item.label}</Text>
                <Ionicons
                  color={colors.textMuted}
                  name="chevron-forward"
                  size={19}
                />
              </Pressable>
            ))}
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Ionicons
                color={colors.danger}
                name="log-out-outline"
                size={23}
              />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  divider: {
    backgroundColor: colors.border,
    height: 8,
    marginVertical: spacing.xs,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    color: colors.danger,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: { backgroundColor: colors.background },
  rowText: { color: colors.text, flex: 1, fontSize: 15, fontWeight: "600" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "82%",
    paddingTop: spacing.sm,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
});
