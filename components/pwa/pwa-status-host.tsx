import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname } from "expo-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppToast } from "@/components/common/app-toast";
import {
  getActiveVoiceCall,
  subscribeActiveVoiceCall,
  type ActiveVoiceCall,
} from "@/features/calls/call-events";
import {
  applyPwaUpdate,
  getPwaSnapshot,
  initializePwa,
  subscribePwa,
} from "@/services/pwa.service";
import { spacing, useTheme } from "@/theme";

export function PwaStatusHost() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const snapshot = useSyncExternalStore(
    subscribePwa,
    getPwaSnapshot,
    getPwaSnapshot,
  );
  const [activeCall, setActiveCall] = useState<ActiveVoiceCall | null>(
    getActiveVoiceCall(),
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    initializePwa();
    return subscribeActiveVoiceCall(setActiveCall);
  }, []);

  if (Platform.OS !== "web" || (snapshot.isOnline && !snapshot.updateAvailable)) {
    return null;
  }

  const update = async () => {
    const result = await applyPwaUpdate();
    if (result === "deferred") {
      showAppToast({
        message: "Hãy cập nhật sau khi cuộc gọi kết thúc.",
      });
    }
  };

  const callInProgress =
    Boolean(activeCall) || /^\/(?:call|group-call|incoming-call)\//.test(pathname);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: Math.max(insets.bottom, spacing.md) + 68 }]}
    >
      {!snapshot.isOnline && (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            styles.notice,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
          ]}
        >
          <Ionicons color={theme.colors.warning} name="cloud-offline-outline" size={20} />
          <Text style={[styles.noticeText, { color: theme.colors.text }]}>
            Không có kết nối Internet
          </Text>
        </View>
      )}
      {snapshot.updateAvailable && (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.notice,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
          ]}
        >
          <Ionicons color={theme.colors.primary} name="refresh-outline" size={20} />
          <Text style={[styles.noticeText, { color: theme.colors.text }]}>Có phiên bản ANKT mới</Text>
          <Pressable
            accessibilityHint={callInProgress ? "Khả dụng sau khi cuộc gọi kết thúc" : undefined}
            accessibilityLabel="Cập nhật ANKT"
            accessibilityRole="button"
            onPress={() => void update()}
            style={({ pressed }) => [
              styles.updateButton,
              { backgroundColor: theme.colors.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.updateText, { color: theme.colors.primaryContrast }]}>
              {callInProgress ? "Để sau cuộc gọi" : "Cập nhật"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
    gap: spacing.sm,
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    zIndex: 950,
  },
  notice: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 460,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  noticeText: { flex: 1, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.76 },
  updateButton: { borderRadius: 9, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  updateText: { fontSize: 12, fontWeight: "800" },
});
