import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type ActiveVoiceCall,
  subscribeActiveVoiceCall,
} from "@/features/calls/call-events";
import { colors, spacing } from "@/theme";

export function ActiveCallBanner() {
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

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#12B76A",
    left: 0,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1000,
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
