import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useState, useMemo } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CallAvatarHalo, CallBackdrop } from "@/components/calls/call-visuals";
import {
  clearIncomingCall,
  subscribeCallLifecycle,
  subscribeIncomingCalls,
} from "@/features/calls/call-events";
import { rejectVoiceCall } from "@/services/call.service";
import { dismissIncomingCallNotification } from "@/services/incoming-call-notification.service";
import { clearPendingIncomingCall } from "@/services/pending-incoming-call.service";
import {
  CALL_ANSWER_TIMEOUT_MS,
} from "@/features/calls/call-waiting";
import {
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
} from "@/services/incoming-call-ringtone.service";
import { spacing } from "@/theme";
import { CallType } from "@/types/call";
import type { IncomingCallEvent } from "@/types/call";
import { type ThemeColors, useTheme } from "@/theme";


export function IncomingCallHost() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [incomingCall, setIncomingCall] = useState<IncomingCallEvent | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const stopRingtone = useCallback(stopIncomingCallRingtone, []);

  useEffect(() => {
    if (!incomingCall) return;

    console.info("[Call] show incoming UI", {
      callId: incomingCall.callId,
      isGroupCall: incomingCall.isGroupCall,
    });
    void startIncomingCallRingtone()
      .then(() => {
        console.info("[Call][Audio] play ringtone", {
          callId: incomingCall.callId,
        });
      })
      .catch((error: unknown) => {
        console.info(
          "[Call][Audio] incoming ringtone unavailable",
          error instanceof Error ? error.message : String(error),
        );
      });
  }, [incomingCall, stopRingtone]);

  useEffect(() => {
    return () => {
      console.info("[Call][Audio] dispose ringtone");
      stopRingtone();
    };
  }, [stopRingtone]);

  const cleanup = useCallback(() => {
    console.info("[Call][Audio] stop ringtone", {
      callId: incomingCall?.callId,
    });
    stopRingtone();
    clearIncomingCall(incomingCall?.callId);
    if (incomingCall?.callId) {
      void clearPendingIncomingCall(incomingCall.callId);
    }
    setIncomingCall(null);
    setIsConnecting(false);
  }, [incomingCall?.callId, stopRingtone]);

  const accept = useCallback(async () => {
    if (!incomingCall || isConnecting) return;
    stopRingtone();
    setIsConnecting(true);
    const nextCall = incomingCall;
    await dismissIncomingCallNotification(nextCall.callId).catch(() => undefined);
    clearIncomingCall(nextCall.callId);
    setIncomingCall(null);
    setIsConnecting(false);
    router.push({
      pathname: nextCall.isGroupCall
        ? "/group-call/[callId]"
        : "/call/[callId]",
      params: nextCall.isGroupCall
        ? { callId: nextCall.callId }
        : {
            avatarUrl: nextCall.caller.avatarUrl ?? "",
            callId: nextCall.callId,
            callType: String(nextCall.callType),
            conversationId: nextCall.conversationId,
            displayName: nextCall.caller.displayName,
            mode: "receiver",
          },
    });
  }, [incomingCall, isConnecting, stopRingtone]);

  const reject = useCallback(async () => {
    if (!incomingCall) return;
    stopRingtone();
    try {
      if (!incomingCall.isGroupCall) {
        await rejectVoiceCall(incomingCall.callId);
      }
    } finally {
      await dismissIncomingCallNotification(incomingCall.callId).catch(() => undefined);
      cleanup();
    }
  }, [cleanup, incomingCall, stopRingtone]);

  useEffect(() => {
    const unsubscribers = [
      subscribeIncomingCalls((event) => {
        setIncomingCall((current) => current ?? event);
      }),
      subscribeCallLifecycle((event) => {
        if (event.callId === incomingCall?.callId) {
          stopRingtone();
          void dismissIncomingCallNotification(event.callId).catch(() => undefined);
          cleanup();
        }
      }),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [cleanup, incomingCall?.callId, stopRingtone]);

  useEffect(() => {
    if (!incomingCall) return;

    const timeout = setTimeout(() => {
      console.info("[Call] incoming call timeout", {
        callId: incomingCall.callId,
      });
      void dismissIncomingCallNotification(incomingCall.callId).catch(
        () => undefined,
      );
      cleanup();
    }, CALL_ANSWER_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [cleanup, incomingCall]);

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
        <CallBackdrop />
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {incomingCall?.isGroupCall
              ? incomingCall.callType === CallType.Video
                ? "Cuộc gọi video nhóm đến"
                : "Cuộc gọi nhóm đến"
              : incomingCall?.callType === CallType.Video
                ? "Cuộc gọi video đến"
                : "Cuộc gọi đến"}
          </Text>
        </View>
        <View style={styles.identity}>
          <CallAvatarHalo size={250}>
            {incomingCall?.caller.avatarUrl ? (
              <Image source={{ uri: incomingCall.caller.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons color={colors.primary} name="person" size={34} />
              </View>
            )}
          </CallAvatarHalo>
          <Text numberOfLines={1} style={styles.name}>
            {incomingCall?.caller.displayName}
          </Text>
          <Text style={styles.status}>
            {isConnecting
              ? "Đang kết nối..."
              : incomingCall?.isGroupCall
                ? "Đang mời bạn tham gia nhóm"
                : incomingCall?.callType === CallType.Video
                  ? "Đang gọi video cho bạn"
                  : "Đang gọi cho bạn"}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  accept: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
  },
  actionItem: { alignItems: "center", gap: spacing.sm, minWidth: 96 },
  actionLabel: { color: colors.text, fontSize: 14, fontWeight: "800" },
  actions: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    padding: spacing.md,
    paddingHorizontal: spacing.xl,
    width: "100%",
  },
  avatar: {
    borderColor: colors.primary,
    borderRadius: 64,
    borderWidth: 2,
    height: 128,
    width: 128,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 64,
    height: 128,
    justifyContent: "center",
    width: 128,
  },
  button: {
    alignItems: "center",
    borderRadius: 999,
    height: 64,
    justifyContent: "center",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 13,
    width: 64,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  headerText: { color: colors.textMuted, fontSize: 15, fontWeight: "800" },
  identity: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  name: { color: colors.text, fontSize: 28, fontWeight: "900", maxWidth: "100%" },
  reject: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  status: { color: colors.textMuted, fontSize: 15, fontWeight: "800" },
});
