import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  clearIncomingCall,
  subscribeCallLifecycle,
  subscribeIncomingCalls,
} from "@/features/calls/call-events";
import { rejectVoiceCall } from "@/services/call.service";
import { colors, spacing } from "@/theme";
import { CallType } from "@/types/call";
import type { IncomingCallEvent } from "@/types/call";

export function IncomingCallHost() {
  const insets = useSafeAreaInsets();
  const [incomingCall, setIncomingCall] = useState<IncomingCallEvent | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const cleanup = useCallback(() => {
    clearIncomingCall(incomingCall?.callId);
    setIncomingCall(null);
    setIsConnecting(false);
  }, [incomingCall?.callId]);

  const accept = useCallback(async () => {
    if (!incomingCall || isConnecting) return;
    setIsConnecting(true);
    const nextCall = incomingCall;
    clearIncomingCall(nextCall.callId);
    setIncomingCall(null);
    setIsConnecting(false);
    router.push({
      pathname: "/call/[callId]",
      params: {
        avatarUrl: nextCall.caller.avatarUrl ?? "",
        callId: nextCall.callId,
        callType: String(nextCall.callType),
        conversationId: nextCall.conversationId,
        displayName: nextCall.caller.displayName,
        mode: "receiver",
      },
    });
  }, [incomingCall, isConnecting]);

  const reject = useCallback(async () => {
    if (!incomingCall) return;
    try {
      await rejectVoiceCall(incomingCall.callId);
    } finally {
      cleanup();
    }
  }, [cleanup, incomingCall]);

  useEffect(() => {
    const unsubscribers = [
      subscribeIncomingCalls((event) => {
        setIncomingCall((current) => current ?? event);
      }),
      subscribeCallLifecycle((event) => {
        if (event.callId === incomingCall?.callId) cleanup();
      }),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [cleanup, incomingCall?.callId]);

  return (
    <Modal animationType="fade" presentationStyle="fullScreen" visible={incomingCall !== null}>
      <View
        style={[
          styles.screen,
          {
            paddingBottom: Math.max(insets.bottom, spacing.xl),
            paddingTop: Math.max(insets.top, spacing.xl),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {incomingCall?.callType === CallType.Video ? "Cuộc gọi video đến" : "Cuộc gọi đến"}
          </Text>
        </View>
        <View style={styles.identity}>
          {incomingCall?.caller.avatarUrl ? (
            <Image source={{ uri: incomingCall.caller.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons color={colors.primary} name="person" size={34} />
            </View>
          )}
          <Text numberOfLines={1} style={styles.name}>
            {incomingCall?.caller.displayName}
          </Text>
          <Text style={styles.status}>
            {isConnecting ? "Đang kết nối..." : incomingCall?.callType === CallType.Video ? "Đang gọi video cho bạn" : "Đang gọi cho bạn"}
          </Text>
        </View>
        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <Pressable accessibilityLabel="Từ chối cuộc gọi" disabled={isConnecting} onPress={reject} style={[styles.button, styles.reject]}>
              <Ionicons color={colors.white} name="close" size={28} />
            </Pressable>
            <Text style={styles.actionLabel}>Từ chối</Text>
          </View>
          <View style={styles.actionItem}>
            <Pressable accessibilityLabel="Nhận cuộc gọi" disabled={isConnecting} onPress={accept} style={[styles.button, styles.accept]}>
              <Ionicons color={colors.white} name="call" size={28} />
            </Pressable>
            <Text style={styles.actionLabel}>Trả lời</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  accept: { backgroundColor: "#12B76A" },
  actionItem: { alignItems: "center", gap: spacing.sm, minWidth: 96 },
  actionLabel: { color: colors.white, fontSize: 14, fontWeight: "800" },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: spacing.xl,
    width: "100%",
  },
  avatar: { borderRadius: 64, height: 128, width: 128 },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 64,
    height: 128,
    justifyContent: "center",
    width: 128,
  },
  button: { alignItems: "center", borderRadius: 999, height: 72, justifyContent: "center", width: 72 },
  header: { alignItems: "center", minHeight: 44 },
  headerText: { color: "rgba(255, 255, 255, 0.72)", fontSize: 15, fontWeight: "800" },
  identity: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  name: { color: colors.white, fontSize: 28, fontWeight: "900", maxWidth: "100%" },
  reject: { backgroundColor: colors.danger },
  screen: { backgroundColor: "#101828", flex: 1, paddingHorizontal: spacing.xl },
  status: { color: "rgba(255, 255, 255, 0.72)", fontSize: 15, fontWeight: "800" },
});
