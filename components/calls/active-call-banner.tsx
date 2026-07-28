import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type ActiveVoiceCall,
  subscribeActiveVoiceCall,
} from "@/features/calls/call-events";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function ActiveCallBanner() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [call, setCall] = useState<ActiveVoiceCall | null>(null);

  useEffect(() => subscribeActiveVoiceCall(setCall), []);

  if (!call || pathname.startsWith("/call/")) return null;

  const openCall = () => {
    router.push({
      pathname: "/call/[callId]",
      params: {
        avatarUrl: call.avatarUrl ?? "",
        callId: call.callId,
        callType: String(call.callType),
        conversationId: call.conversationId,
        displayName: call.displayName,
        mode: call.mode,
      },
    });
  };

  return (
    <Pressable
      accessibilityLabel="Quay lại cuộc gọi"
      onPress={openCall}
      style={[styles.banner, { paddingTop: Math.max(insets.top, spacing.sm) }]}
    >
      <View style={styles.content}>
        <Ionicons color={colors.white} name="call" size={18} />
        <Text numberOfLines={1} style={styles.text}>
          Đang trong cuộc gọi với {call.displayName}
        </Text>
        <Ionicons color={colors.white} name="chevron-forward" size={18} />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  banner: {
    backgroundColor: colors.visuals.rgb_14_28_49_0_94,
    borderBottomColor: colors.primary,
    borderBottomWidth: 1,
    left: 0,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1000,
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 32,
  },
  text: { color: colors.white, flexShrink: 1, fontSize: 14, fontWeight: "900" },
});
