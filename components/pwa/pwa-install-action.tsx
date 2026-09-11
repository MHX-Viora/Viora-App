import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  getPwaSnapshot,
  requestPwaInstall,
  subscribePwa,
} from "@/services/pwa.service";
import { spacing, useTheme } from "@/theme";

export function PwaInstallAction() {
  const { theme } = useTheme();
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const snapshot = useSyncExternalStore(
    subscribePwa,
    getPwaSnapshot,
    getPwaSnapshot,
  );

  if (
    Platform.OS !== "web" ||
    (snapshot.installState !== "installable" && snapshot.installState !== "installing")
  ) {
    return null;
  }

  const installing = snapshot.installState === "installing";
  const isBrowserManual = snapshot.installMethod === "browser-manual";
  const install = async () => {
    const result = await requestPwaInstall();
    if (result === "manual") setShowInstallHelp(true);
  };

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.divider }]}>
      <Pressable
        accessibilityHint={
          snapshot.installMethod === "ios-manual"
            ? "Hiển thị hướng dẫn thêm ANKT vào Màn hình chính"
            : isBrowserManual
              ? "Hiển thị hướng dẫn cài ANKT từ menu trình duyệt"
              : "Mở hộp thoại cài đặt của trình duyệt"
        }
        accessibilityLabel="Cài đặt ANKT"
        accessibilityRole="button"
        disabled={installing}
        onPress={() => void install()}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: theme.colors.secondaryBackground },
          installing && styles.disabled,
        ]}
      >
        {installing ? (
          <ActivityIndicator color={theme.colors.primary} size="small" />
        ) : (
          <Ionicons color={theme.colors.primary} name="download-outline" size={23} />
        )}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Cài đặt ANKT</Text>
          <Text style={[styles.description, { color: theme.colors.textMuted }]}>
            {installing
              ? "Đang mở trình cài đặt…"
              : snapshot.installMethod === "ios-manual"
                ? "Thêm ANKT vào Màn hình chính"
                : isBrowserManual
                  ? "Xem hướng dẫn cài từ trình duyệt"
                  : "Mở ANKT như một ứng dụng độc lập"}
          </Text>
        </View>
        {!installing && (
          <Ionicons color={theme.colors.textMuted} name="chevron-forward" size={19} />
        )}
      </Pressable>
      {showInstallHelp && (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.help, { backgroundColor: theme.colors.primarySoft }]}
        >
          <Ionicons color={theme.colors.primary} name="share-outline" size={20} />
          <Text style={[styles.helpText, { color: theme.colors.text }]}>
            {snapshot.installMethod === "ios-manual"
              ? "Mở menu Chia sẻ, rồi chọn Thêm vào Màn hình chính."
              : "Mở menu trình duyệt (⋮), rồi chọn Cài đặt ANKT hoặc Cài đặt ứng dụng."}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: StyleSheet.hairlineWidth },
  copy: { flex: 1 },
  description: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  disabled: { opacity: 0.7 },
  help: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    padding: spacing.sm,
  },
  helpText: { flex: 1, fontSize: 13, lineHeight: 18 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  title: { fontSize: 15, fontWeight: "700" },
});
