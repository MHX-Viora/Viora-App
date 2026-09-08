import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CallAvatarHalo, CallBackdrop } from "@/components/calls/call-visuals";
import { getCallSurfaceLayout } from "@/components/calls/call-screen-layout";
import { UserAvatar } from "@/components/common/user-avatar";
import { subscribeCallAccepted } from "@/features/calls/call-events";
import {
  createWebCallOfferState,
  sendWebCallOfferOnce,
} from "@/features/calls/web-call-offer";
import { useResponsive } from "@/hooks/use-responsive";
import {
  acceptVoiceCall, cancelVoiceCall, endVoiceCall, getIceServers, rejectVoiceCall,
} from "@/services/call.service";
import {
  onCallRealtime, sendCallAccepted, sendCallAnswer, sendCallIceCandidate,
  sendCallOffer, startCallRealtime,
} from "@/services/call-realtime.service";
import { createVoicePeer } from "@/services/webrtc-call.service.web";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import { CallType } from "@/types/call";

type SignalEvent = { callId?: string; signal?: unknown };
type VoicePeer = Awaited<ReturnType<typeof createVoicePeer>>;
type WebCallStatus = "active" | "calling" | "connecting" | "ending" | "failed";

const getPayloadCallId = (payload: unknown) => {
  if (typeof payload !== "object" || payload === null) return "";
  const record = payload as { callId?: unknown; id?: unknown };
  return typeof record.callId === "string"
    ? record.callId
    : typeof record.id === "string"
      ? record.id
      : "";
};

function Video({ backgroundColor, stream, muted }: { backgroundColor: string; stream: MediaStream | null; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <video autoPlay muted={muted} playsInline ref={ref} style={{ backgroundColor, height: "100%", objectFit: "cover", width: "100%" }} />;
}

function Audio({ muted, stream }: { muted: boolean; stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <audio autoPlay muted={muted} ref={ref} />;
}

export function VoiceCallScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isDesktopWeb } = useResponsive();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    avatarUrl?: string; callId?: string; callType?: string;
    conversationId?: string; displayName?: string; mode?: string;
  }>();
  const callId = params.callId ?? "";
  const conversationId = params.conversationId ?? "";
  const displayName = params.displayName ?? "Cuộc gọi";
  const avatarUrl = params.avatarUrl || null;
  const isVideo = Number(params.callType) === CallType.Video;
  const mode = params.mode === "receiver" ? "receiver" : "caller";
  const peerRef = useRef<VoicePeer | null>(null);
  const creatingRef = useRef<Promise<VoicePeer> | null>(null);
  const offerStateRef = useRef(createWebCallOfferState());
  const remoteReadyRef = useRef(false);
  const pendingIceRef = useRef<unknown[]>([]);
  const endingRef = useRef(false);
  const connectedAtRef = useRef<number | null>(null);
  const [status, setStatus] = useState<WebCallStatus>(mode === "caller" ? "calling" : "connecting");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  // Browsers do not expose the native earpiece/speaker route. Keep remote audio
  // audible by default and use this control as the Web audio-output toggle.
  const [speakerOn, setSpeakerOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(isVideo);

  const backToChat = useCallback(() => {
    if (conversationId) {
      router.replace({ pathname: "/chat/[conversationId]", params: { conversationId } });
    } else router.replace("/");
  }, [conversationId]);
  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
  }, []);
  const markActive = useCallback(() => {
    connectedAtRef.current ??= Date.now();
    setStatus("active");
  }, []);
  const flushIce = useCallback(async () => {
    if (!peerRef.current || !remoteReadyRef.current) return;
    for (const candidate of pendingIceRef.current.splice(0)) {
      await peerRef.current.addIceCandidate(candidate);
    }
  }, []);
  const createPeer = useCallback(async () => {
    if (peerRef.current) return peerRef.current;
    if (creatingRef.current) return creatingRef.current;
    creatingRef.current = (async () => {
      const peer = await createVoicePeer(
        await getIceServers(),
        (candidate) => {
          void sendCallIceCandidate(callId, candidate).catch((error: unknown) => {
            console.info(
              "[Call][Web] ICE delivery delayed",
              error instanceof Error ? error.message : String(error),
            );
          });
        },
        (state) => {
          if (state === "connected" || state === "completed") markActive();
          if (state === "failed") setStatus("failed");
        },
        { onLocalStream: setLocalStream, onRemoteStream: setRemoteStream, video: isVideo },
      );
      peer.setMicrophoneEnabled(true);
      peer.setCameraEnabled(isVideo);
      peerRef.current = peer;
      return peer;
    })();
    try { return await creatingRef.current; }
    finally { creatingRef.current = null; }
  }, [callId, isVideo, markActive]);
  const sendOffer = useCallback(async () => {
    const result = await sendWebCallOfferOnce(
      offerStateRef.current,
      async () => (await createPeer()).createOffer(),
      (offer) => sendCallOffer(callId, offer),
    );
    if (result.status === "sent") setStatus("connecting");
    return result;
  }, [callId, createPeer]);
  const retryOffer = useCallback(async () => {
    if (endingRef.current) return;
    const result = await sendOffer();
    if (endingRef.current || result.status !== "failed") return;
    setStatus("failed");
    console.info(
      "[Call][Web] offer delivery failed; keeping call open for retry",
      result.error instanceof Error ? result.error.message : String(result.error),
    );
  }, [sendOffer]);
  const leave = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setStatus("ending");
    try {
      if (mode === "caller" && !offerStateRef.current.sent) await cancelVoiceCall(callId);
      else if (mode === "receiver" && !peerRef.current) await rejectVoiceCall(callId);
      else await endVoiceCall(callId);
    } catch { /* The other participant may already have ended the call. */ }
    closePeer();
    backToChat();
  }, [backToChat, callId, closePeer, mode]);

  useEffect(() => {
    if (!callId) { backToChat(); return; }
    void (async () => {
      try {
        if (!(await startCallRealtime())) throw new Error("Không thể kết nối máy chủ cuộc gọi.");
        if (mode === "receiver") {
          await acceptVoiceCall(callId);
          await createPeer();
          await sendCallAccepted(callId);
        } else if (isVideo) await createPeer();
      } catch (error) {
        Alert.alert(
          "Không thể bắt đầu cuộc gọi",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
          [{ text: "Đóng", onPress: backToChat }],
        );
      }
    })();
    return closePeer;
  }, [backToChat, callId, closePeer, createPeer, isVideo, mode]);

  useEffect(() => {
    const handleAccepted = (payload: unknown) => {
      if (mode === "caller" && getPayloadCallId(payload) === callId) {
        void retryOffer();
      }
    };
    const offAcceptedNotification = subscribeCallAccepted(handleAccepted);
    const offAccepted = onCallRealtime("CallAccepted", (payload) => {
      handleAccepted(payload);
    });
    const offOffer = onCallRealtime("ReceiveOffer", (payload) => {
      const event = payload as SignalEvent;
      if (event.callId !== callId || !event.signal) return;
      void (async () => {
        const peer = await createPeer();
        const answer = await peer.createAnswer(event.signal);
        remoteReadyRef.current = true;
        await flushIce();
        await sendCallAnswer(callId, answer);
      })().catch((error: unknown) => {
        setStatus("failed");
        console.info(
          "[Call][Web] answer creation failed; keeping call open",
          error instanceof Error ? error.message : String(error),
        );
      });
    });
    const offAnswer = onCallRealtime("ReceiveAnswer", (payload) => {
      const event = payload as SignalEvent;
      if (event.callId !== callId || !event.signal || !peerRef.current) return;
      void peerRef.current.setAnswer(event.signal).then(() => {
        remoteReadyRef.current = true;
        return flushIce();
      }).catch((error: unknown) => {
        setStatus("failed");
        console.info(
          "[Call][Web] remote answer failed; keeping call open",
          error instanceof Error ? error.message : String(error),
        );
      });
    });
    const offIce = onCallRealtime("ReceiveIceCandidate", (payload) => {
      const event = payload as SignalEvent;
      if (event.callId !== callId || !event.signal) return;
      if (!peerRef.current || !remoteReadyRef.current) pendingIceRef.current.push(event.signal);
      else void peerRef.current.addIceCandidate(event.signal);
    });
    const offEnded = onCallRealtime("CallEnded", (payload) => {
      if ((payload as SignalEvent).callId === callId) { closePeer(); backToChat(); }
    });
    return () => {
      offAcceptedNotification();
      offAccepted();
      offOffer();
      offAnswer();
      offIce();
      offEnded();
    };
  }, [backToChat, callId, closePeer, createPeer, flushIce, mode, retryOffer]);

  useEffect(() => {
    if (status !== "active" || !connectedAtRef.current) return;
    const update = () => {
      const connectedAt = connectedAtRef.current;
      if (connectedAt) setElapsedSeconds(Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [status]);

  const toggleMic = () => {
    const next = !micOn;
    peerRef.current?.setMicrophoneEnabled(next);
    setMicOn(next);
  };
  const toggleCamera = () => {
    const next = !cameraOn;
    peerRef.current?.setCameraEnabled(next);
    setCameraOn(next);
  };
  const statusText = status === "active"
    ? `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`
    : status === "calling" ? "Đang gọi..."
      : status === "ending" ? "Cuộc gọi đã kết thúc"
        : status === "failed" ? "Mất kết nối" : "Đang kết nối...";

  return (
    <View style={styles.viewport}>
      <View style={[
        styles.screen,
        getCallSurfaceLayout({ isDesktopWeb }),
        {
          paddingBottom: Math.max(insets.bottom, spacing.xl),
          paddingTop: Math.max(insets.top, spacing.xl),
        },
      ]}>
        <CallBackdrop />
        {isVideo && remoteStream ? (
          <View style={styles.remoteVideo}><Video backgroundColor={colors.background} stream={remoteStream} /></View>
        ) : null}
        <Audio muted={!speakerOn} stream={remoteStream} />
        <View style={styles.topBar}>
          <View style={styles.headerBalance} />
          <View style={styles.headerInfo}>
            <Text numberOfLines={1} style={styles.headerName}>{displayName}</Text>
            <Text style={styles.headerStatus}>{statusText}</Text>
          </View>
          <View style={styles.headerBalance} />
        </View>
        <View style={styles.identity}>
          {!isVideo || !remoteStream ? (
            <CallAvatarHalo animated={status === "calling" || status === "connecting"}>
              <UserAvatar displayName={displayName} imageUrl={avatarUrl} size={112} style={styles.avatar} />
            </CallAvatarHalo>
          ) : null}
        </View>
        {isVideo && localStream ? (
          <View style={styles.localVideo}><Video backgroundColor={colors.background} muted stream={localStream} /></View>
        ) : null}
        {status === "failed" && mode === "caller" && !offerStateRef.current.sent ? (
          <Pressable
            accessibilityLabel="Thử kết nối lại"
            accessibilityRole="button"
            onPress={() => void retryOffer()}
            style={styles.retryButton}
          >
            <Ionicons color={colors.text} name="refresh" size={20} />
            <Text style={styles.retryText}>Thử kết nối lại</Text>
          </Pressable>
        ) : null}
        <View style={styles.controls}>
          <Pressable
            accessibilityLabel={micOn ? "Tắt micro" : "Bật micro"}
            accessibilityRole="button"
            onPress={toggleMic}
            style={[styles.secondaryButton, !micOn && styles.controlDisabled]}
          >
            <Ionicons color={colors.white} name={micOn ? "mic" : "mic-off"} size={24} />
          </Pressable>
          <Pressable
            accessibilityLabel={speakerOn ? "Tắt âm thanh" : "Bật âm thanh"}
            accessibilityRole="button"
            onPress={() => setSpeakerOn((current) => !current)}
            style={[styles.secondaryButton, speakerOn && styles.controlActive]}
          >
            <Ionicons color={colors.white} name={speakerOn ? "volume-high" : "volume-mute"} size={24} />
          </Pressable>
          {isVideo ? (
            <Pressable
              accessibilityLabel={cameraOn ? "Tắt camera" : "Bật camera"}
              accessibilityRole="button"
              onPress={toggleCamera}
              style={[styles.secondaryButton, !cameraOn && styles.controlDisabled]}
            >
              <Ionicons color={colors.white} name={cameraOn ? "videocam" : "videocam-off"} size={24} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel="Kết thúc cuộc gọi"
            accessibilityRole="button"
            onPress={() => void leave()}
            style={styles.endButton}
          >
            <Ionicons color={colors.dangerContrast} name="call" size={28} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: {
    borderColor: colors.visuals.rgb_36_221_228_0_82, borderRadius: 56,
    borderWidth: 2, height: 112, width: 112,
  },
  controls: {
    alignItems: "center", backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1,
    flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.md,
  },
  controlActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  controlDisabled: {
    backgroundColor: colors.visuals.rgb_255_84_112_0_28, borderColor: colors.danger,
  },
  endButton: {
    alignItems: "center", backgroundColor: colors.danger, borderRadius: 30,
    height: 60, justifyContent: "center", shadowColor: colors.danger,
    shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.9, shadowRadius: 14,
    transform: [{ rotate: "135deg" }], width: 60,
  },
  headerBalance: { height: 44, width: 44 },
  headerInfo: {
    alignItems: "center", flex: 1, justifyContent: "center", minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  headerName: { color: colors.text, fontSize: 16, fontWeight: "900", maxWidth: "100%" },
  headerStatus: { color: colors.textMuted, fontSize: 13, fontWeight: "800" },
  identity: {
    alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl,
  },
  localVideo: {
    backgroundColor: colors.text, borderColor: colors.visuals.rgb_255_255_255_0_55,
    borderRadius: 8, borderWidth: 1, height: 160, overflow: "hidden",
    position: "absolute", right: spacing.lg, top: 96, width: 110,
  },
  remoteVideo: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.text, overflow: "hidden" },
  retryButton: {
    alignItems: "center", alignSelf: "center", backgroundColor: colors.surfaceElevated,
    borderColor: colors.primary, borderRadius: 999, borderWidth: 1,
    flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  retryText: { color: colors.text, fontSize: 14, fontWeight: "800" },
  screen: {
    backgroundColor: colors.background, flex: 1, overflow: "hidden", paddingHorizontal: spacing.xl,
  },
  secondaryButton: {
    alignItems: "center", backgroundColor: colors.visuals.rgb_14_28_49_0_72,
    borderColor: colors.borderSubtle, borderRadius: 26, borderWidth: 1,
    height: 52, justifyContent: "center", width: 52,
  },
  topBar: {
    alignItems: "center", backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1,
    flexDirection: "row", minHeight: 48, paddingHorizontal: spacing.xs,
  },
  viewport: { alignItems: "center", backgroundColor: colors.background, flex: 1 },
});
