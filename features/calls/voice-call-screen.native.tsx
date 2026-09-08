import Ionicons from "@expo/vector-icons/Ionicons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { type ComponentType, useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CallAvatarHalo,
  CallBackdrop,
} from "@/components/calls/call-visuals";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  clearActiveVoiceCall,
  clearIncomingCall,
  getActiveVoiceCall,
  setActiveVoiceCall,
  subscribeCallAccepted,
  subscribeCallLifecycle,
} from "@/features/calls/call-events";
import {
  CALL_ANSWER_TIMEOUT_MS,
  isWaitingForAnswer,
  OUTGOING_RINGBACK_VOLUME,
  shouldNavigateAwayFromCall,
} from "@/features/calls/call-waiting";
import {
  acceptVoiceCall,
  cancelVoiceCall,
  endVoiceCall,
  getIceServers,
  getVoiceCall,
  rejectVoiceCall,
} from "@/services/call.service";
import { setCallScreenActive } from "@/services/incoming-call-settings.service";
import {
  onCallRealtime,
  onCallRealtimeReconnected,
  sendCallAccepted,
  sendCallAnswer,
  sendCallIceCandidate,
  sendCallOffer,
  sendReconnectCall,
  startCallRealtime,
} from "@/services/call-realtime.service";
import { createVoicePeer } from "@/services/webrtc-call.service";
import { spacing } from "@/theme";
import { CallStatus, CallType } from "@/types/call";
import { type ThemeColors, useTheme } from "@/theme";


type VoicePeer = Awaited<ReturnType<typeof createVoicePeer>>;
const { RTCView } = require("@livekit/react-native-webrtc") as {
  RTCView: ComponentType<{ objectFit?: "cover" | "contain"; streamURL: string; style?: unknown; zOrder?: number }>;
};

const getPayloadCallId = (payload: unknown) => {
  if (typeof payload !== "object" || payload === null) return "";
  const record = payload as { callId?: unknown; id?: unknown };
  return typeof record.callId === "string"
    ? record.callId
    : typeof record.id === "string"
      ? record.id
      : "";
};

export function VoiceCallScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    avatarUrl?: string;
    callId?: string;
    callType?: string;
    conversationId?: string;
    displayName?: string;
    mode?: "caller" | "receiver";
  }>();
  const callId = params.callId ?? "";
  const conversationId = params.conversationId ?? "";
  const displayName = params.displayName ?? "Cuộc gọi";
  const avatarUrl = params.avatarUrl || null;
  const callType = Number(params.callType ?? CallType.Audio) === CallType.Video ? CallType.Video : CallType.Audio;
  const isVideoCall = callType === CallType.Video;
  const ringbackPlayer = useAudioPlayer(
    require("../../assets/audio/nhac_cho.mp3"),
  );
  const mode = params.mode ?? "caller";
  useEffect(() => {
    setCallScreenActive(true);
    return () => setCallScreenActive(false);
  }, []);
  const peerRef = useRef<VoicePeer | null>(null);
  const peerPromiseRef = useRef<Promise<VoicePeer> | null>(null);
  const pendingIceCandidatesRef = useRef<unknown[]>([]);
  const remoteDescriptionReadyRef = useRef(false);
  const isCreatingOfferRef = useRef(false);
  const hasSentOfferRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const isEndingRef = useRef(false);
  const isMountedRef = useRef(true);
  const hasNavigatedAwayRef = useRef(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const activeCall = callId ? getActiveVoiceCall() : null;
  const [status, setStatus] = useState<"calling" | "connecting" | "active" | "ending" | "ended">(
    activeCall?.callId === callId ? activeCall.status : mode === "caller" ? "calling" : "connecting",
  );
  const [connectedAtMs, setConnectedAtMs] = useState<number | null>(
    activeCall?.callId === callId && activeCall.connectedAtMs ? activeCall.connectedAtMs : null,
  );
  const connectedAtMsRef = useRef<number | null>(
    activeCall?.callId === callId && activeCall.connectedAtMs ? activeCall.connectedAtMs : null,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [localStreamUrl, setLocalStreamUrl] = useState("");
  const [remoteStreamUrl, setRemoteStreamUrl] = useState("");
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(isVideoCall);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    },
    [],
  );

  const rememberCall = useCallback(
    (
      nextStatus: "calling" | "connecting" | "active",
      peer: VoicePeer | null = peerRef.current,
      nextConnectedAtMs = connectedAtMsRef.current,
    ) => {
      if (!callId || isEndingRef.current) return;
      setActiveVoiceCall({
        avatarUrl,
        callId,
        callType,
        connectedAtMs: nextConnectedAtMs ?? undefined,
        conversationId,
        displayName,
        mode,
        peer: peer ?? undefined,
        status: nextStatus,
      });
    },
    [avatarUrl, callId, callType, conversationId, displayName, mode],
  );

  const markActive = useCallback(
    (peer: VoicePeer | null = peerRef.current) => {
      if (isEndingRef.current) return;
      const nextConnectedAtMs = connectedAtMsRef.current ?? Date.now();
      connectedAtMsRef.current = nextConnectedAtMs;
      setConnectedAtMs(nextConnectedAtMs);
      setStatus("active");
      rememberCall("active", peer, nextConnectedAtMs);
    },
    [rememberCall],
  );

  const cleanup = useCallback((shouldClosePeer = true) => {
    isEndingRef.current = true;
    if (shouldClosePeer) {
      peerRef.current?.close();
    }
    peerRef.current = null;
    peerPromiseRef.current = null;
    pendingIceCandidatesRef.current = [];
    remoteDescriptionReadyRef.current = false;
    clearIncomingCall(callId);
    clearActiveVoiceCall(callId);
  }, [callId]);

  const leaveCall = useCallback((shouldClosePeer = true, delayMs = 0) => {
    cleanup(shouldClosePeer);
    setStatus("ended");
    const navigateAway = () => {
      if (
        !shouldNavigateAwayFromCall(
          isMountedRef.current,
          hasNavigatedAwayRef.current,
        )
      ) {
        return;
      }
      hasNavigatedAwayRef.current = true;
      if (router.canGoBack()) {
        router.back();
        return;
      }
      if (conversationId) {
        router.replace({
          pathname: "/chat/[conversationId]",
          params: { conversationId },
        });
      } else {
        router.replace("/");
      }
    };
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    if (delayMs > 0) {
      navigationTimeoutRef.current = setTimeout(() => {
        navigationTimeoutRef.current = null;
        if (!isMountedRef.current) return;
        setStatus("ended");
        navigateAway();
      }, delayMs);
    } else {
      setStatus("ended");
      navigateAway();
    }
  }, [cleanup, conversationId]);

  const minimizeCall = useCallback(() => {
    if (status === "calling" || status === "connecting" || status === "active") rememberCall(status);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (conversationId) {
      router.replace({
        pathname: "/chat/[conversationId]",
        params: { conversationId },
      });
    } else {
      router.replace("/");
    }
  }, [conversationId, rememberCall, status]);

  const createPeer = useCallback(async () => {
    if (peerRef.current) return peerRef.current;
    if (peerPromiseRef.current) return peerPromiseRef.current;
    peerPromiseRef.current = (async () => {
      const iceServers = await getIceServers();
      const peer = await createVoicePeer(
        iceServers,
        (candidate) => {
          void sendCallIceCandidate(callId, candidate).catch((error) => {
            console.info(
              "[Call][Signal] send ICE candidate failed",
              error instanceof Error ? error.message : String(error),
            );
          });
        },
        (state) => {
          if (state === "connected" || state === "completed") markActive(peerRef.current);
          if (state === "failed" && !isEndingRef.current) {
            Alert.alert(
              "Mất kết nối cuộc gọi",
              "Không thể thiết lập đường truyền. Vui lòng kiểm tra mạng và thử lại.",
            );
          }
        },
        {
          onLocalStream: setLocalStreamUrl,
          onRemoteStream: setRemoteStreamUrl,
          video: isVideoCall,
        },
      );
      peerRef.current = peer;
      peer.setMicrophoneEnabled(isMicrophoneEnabled);
      peer.setCameraEnabled(isCameraEnabled);
      rememberCall(status === "active" ? "active" : "connecting", peer);
      return peer;
    })();
    try {
      return await peerPromiseRef.current;
    } catch (error) {
      peerPromiseRef.current = null;
      throw error;
    }
  }, [
    callId,
    isCameraEnabled,
    isMicrophoneEnabled,
    isVideoCall,
    markActive,
    rememberCall,
    status,
  ]);

  const createAndSendOfferOnce = useCallback(async () => {
    if (isCreatingOfferRef.current || hasSentOfferRef.current) return;
    isCreatingOfferRef.current = true;
    try {
      const peer = await createPeer();
      const offer = await peer.createOffer();
      await sendCallOffer(callId, offer);
      hasSentOfferRef.current = true;
      setStatus("connecting");
      rememberCall("connecting", peer);
      console.info("[Call][Signal] offer sent", { callId });
    } finally {
      isCreatingOfferRef.current = false;
    }
  }, [callId, createPeer, rememberCall]);

  const flushPendingIceCandidates = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer || !remoteDescriptionReadyRef.current) return;
    const candidates = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        console.info(
          "[Call][Signal] queued ICE candidate failed",
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }, []);

  const end = useCallback(async () => {
    if (!callId || status === "ended" || isEndingRef.current) return;
    isEndingRef.current = true;
    clearActiveVoiceCall(callId);
    setStatus("ending");
    try {
      if (mode === "caller" && status === "calling") {
        await cancelVoiceCall(callId);
      } else if (mode === "receiver" && status !== "active") {
        await rejectVoiceCall(callId);
      } else {
        await endVoiceCall(callId);
      }
    } catch (error) {
      try {
        await endVoiceCall(callId);
      } catch {
        console.info("[Call] end fallback failed", error instanceof Error ? error.message : String(error));
      }
    } finally {
      leaveCall();
    }
  }, [callId, leaveCall, mode, status]);

  useEffect(() => {
    if (!callId) return;
    if (status === "ended" || status === "ending") return;
    if (activeCall?.callId === callId && activeCall.peer) {
      peerRef.current = activeCall.peer as VoicePeer;
      setStatus(activeCall.status);
      setConnectedAtMs(activeCall.connectedAtMs ?? null);
      connectedAtMsRef.current = activeCall.connectedAtMs ?? null;
      setLocalStreamUrl((activeCall.peer as VoicePeer).getLocalStreamUrl());
      setRemoteStreamUrl((activeCall.peer as VoicePeer).getRemoteStreamUrl());
      hasInitializedRef.current = true;
      return;
    }
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    rememberCall(status === "active" ? "active" : status === "calling" ? "calling" : "connecting");
    void startCallRealtime().catch((error: unknown) => {
      console.info(
        "[Call][SignalR] initial connection failed",
        error instanceof Error ? error.message : String(error),
      );
    });
    if (mode === "caller" && isVideoCall && !peerRef.current) {
      void createPeer().catch((error) => {
        Alert.alert("Không thể mở camera", error instanceof Error ? error.message : "Vui lòng thử lại.");
        leaveCall();
      });
    }
    if (mode === "receiver") {
      void (async () => {
        try {
          // The caller can send its offer as soon as the REST accept succeeds.
          const callConnection = await startCallRealtime();
          if (!callConnection) {
            throw new Error("Không thể kết nối máy chủ cuộc gọi.");
          }
          await acceptVoiceCall(callId);
          const peer = await createPeer();
          setStatus("connecting");
          rememberCall("connecting", peer);
          await sendCallAccepted(callId);
          console.info("[Call][Signal] accepted and ready", { callId });
        } catch (error) {
          Alert.alert("Không thể nhận cuộc gọi", error instanceof Error ? error.message : "Vui lòng thử lại.");
          leaveCall();
        }
      })();
    }
  }, [activeCall, callId, createPeer, isVideoCall, leaveCall, mode, rememberCall, status]);

  useEffect(() => {
    if (!callId) return;
    const unsubscribers = [
      subscribeCallAccepted(async (payload) => {
        if (mode !== "caller" || getPayloadCallId(payload) !== callId) return;
        setStatus("connecting");
        rememberCall("connecting");
        try {
          await createAndSendOfferOnce();
        } catch (error) {
          Alert.alert("Không thể kết nối cuộc gọi", error instanceof Error ? error.message : "Vui lòng thử lại.");
          leaveCall();
        }
      }),
      onCallRealtime("CallAccepted", async (payload) => {
        if (mode !== "caller" || getPayloadCallId(payload) !== callId) return;
        setStatus("connecting");
        rememberCall("connecting");
        try {
          await createAndSendOfferOnce();
        } catch (error) {
          Alert.alert("Không thể kết nối cuộc gọi", error instanceof Error ? error.message : "Vui lòng thử lại.");
          leaveCall();
        }
      }),
      onCallRealtime("ReceiveOffer", async (payload) => {
        const event = payload as { callId?: string; signal?: unknown };
        if (event.callId !== callId || !event.signal) return;
        try {
          const peer = await createPeer();
          const answer = await peer.createAnswer(event.signal);
          remoteDescriptionReadyRef.current = true;
          await flushPendingIceCandidates();
          await sendCallAnswer(callId, answer);
          setStatus("connecting");
          rememberCall("connecting", peer);
          console.info("[Call][Signal] answer sent", { callId });
        } catch (error) {
          Alert.alert(
            "Không thể kết nối cuộc gọi",
            error instanceof Error ? error.message : "Vui lòng thử lại.",
          );
        }
      }),
      onCallRealtime("ReceiveAnswer", async (payload) => {
        const event = payload as { callId?: string; signal?: unknown };
        if (event.callId !== callId || !event.signal || !peerRef.current) return;
        try {
          await peerRef.current.setAnswer(event.signal);
          remoteDescriptionReadyRef.current = true;
          await flushPendingIceCandidates();
          setStatus("connecting");
          rememberCall("connecting");
        } catch (error) {
          Alert.alert(
            "Không thể kết nối cuộc gọi",
            error instanceof Error ? error.message : "Vui lòng thử lại.",
          );
        }
      }),
      onCallRealtime("ReceiveIceCandidate", async (payload) => {
        const event = payload as { callId?: string; signal?: unknown };
        if (event.callId !== callId || !event.signal) return;
        if (!peerRef.current || !remoteDescriptionReadyRef.current) {
          pendingIceCandidatesRef.current.push(event.signal);
          console.info("[Call][Signal] ICE candidate queued", {
            count: pendingIceCandidatesRef.current.length,
          });
          return;
        }
        try {
          await peerRef.current.addIceCandidate(event.signal);
        } catch (error) {
          console.info(
            "[Call][Signal] ICE candidate failed",
            error instanceof Error ? error.message : String(error),
          );
        }
      }),
      onCallRealtime("ReconnectCall", async (payload) => {
        if (mode !== "caller" || getPayloadCallId(payload) !== callId) return;
        hasSentOfferRef.current = false;
        await createAndSendOfferOnce();
      }),
      onCallRealtimeReconnected(() => {
        void (async () => {
          try {
            await sendReconnectCall(callId);
            if (mode === "caller") {
              hasSentOfferRef.current = false;
              await createAndSendOfferOnce();
            }
          } catch (error) {
            console.info(
              "[Call][SignalR] call recovery failed",
              error instanceof Error ? error.message : String(error),
            );
          }
        })();
      }),
      subscribeCallLifecycle((event) => {
        if (event.callId !== callId) return;
        setStatus("ending");
        leaveCall(true, 1200);
      }),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    callId,
    createAndSendOfferOnce,
    createPeer,
    flushPendingIceCandidates,
    leaveCall,
    mode,
    rememberCall,
  ]);

  useEffect(() => {
    if (mode !== "caller" || !callId || status !== "calling" || hasSentOfferRef.current) return;
    let isMounted = true;
    const checkAccepted = async () => {
      try {
        const call = await getVoiceCall(callId);
        if (!isMounted || call.status !== CallStatus.Accepted || hasSentOfferRef.current) return;
        setStatus("connecting");
        rememberCall("connecting");
        await createAndSendOfferOnce();
      } catch (error) {
        console.info("[Call] accepted polling skipped", error instanceof Error ? error.message : String(error));
      }
    };
    void checkAccepted();
    const timer = setInterval(() => {
      void checkAccepted();
    }, 1500);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [callId, createAndSendOfferOnce, mode, rememberCall, status]);

  useEffect(() => {
    if (status !== "active" || !connectedAtMs) return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - connectedAtMs) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [connectedAtMs, status]);

  useEffect(() => {
    if (isVideoCall || !isWaitingForAnswer(mode, status)) return;

    const timer = setTimeout(() => {
      if (isEndingRef.current) return;
      console.info("[Call] unanswered audio call timed out", {
        callId,
        timeoutMs: CALL_ANSWER_TIMEOUT_MS,
      });
      leaveCall();
    }, CALL_ANSWER_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [callId, isVideoCall, leaveCall, mode, status]);

  useEffect(() => {
    const shouldPlay = !isVideoCall && isWaitingForAnswer(mode, status);
    try {
      ringbackPlayer.loop = true;
      ringbackPlayer.volume = OUTGOING_RINGBACK_VOLUME;

      if (shouldPlay) {
        ringbackPlayer.play();
      } else {
        ringbackPlayer.pause();
        void ringbackPlayer.seekTo(0).catch(() => undefined);
      }
    } catch (error) {
      console.info(
        "[Call][Audio] ringback player unavailable",
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [isVideoCall, mode, ringbackPlayer, status]);

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece:
        status === "active" ? !isSpeakerEnabled : false,
    }).catch((error) => {
      console.info(
        "[Call][Audio] route update failed",
        error instanceof Error ? error.message : String(error),
      );
    });
  }, [isSpeakerEnabled, status]);

  const toggleMicrophone = useCallback(() => {
    setIsMicrophoneEnabled((current) => {
      const next = !current;
      peerRef.current?.setMicrophoneEnabled(next);
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setIsCameraEnabled((current) => {
      const next = !current;
      peerRef.current?.setCameraEnabled(next);
      return next;
    });
  }, []);

  const switchCamera = useCallback(() => {
    peerRef.current?.switchCamera();
  }, []);

  const statusText =
    status === "active"
      ? `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`
      : status === "calling"
        ? "Đang gọi..."
        : status === "ending"
          ? "Cuộc gọi đã kết thúc"
        : "Đang kết nối...";

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, spacing.xl), paddingTop: Math.max(insets.top, spacing.xl) }]}>
      <CallBackdrop />
      {isVideoCall && remoteStreamUrl ? (
        <RTCView objectFit="cover" streamURL={remoteStreamUrl} style={styles.remoteVideo} />
      ) : null}
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Thu nhỏ cuộc gọi" onPress={minimizeCall} style={styles.iconButton}>
          <Ionicons color={colors.icon} name="chevron-down" size={26} />
        </Pressable>
        <View style={styles.videoHeaderInfo}>
          <Text numberOfLines={1} style={styles.videoHeaderName}>
            {displayName}
          </Text>
          <Text style={styles.videoHeaderStatus}>{statusText}</Text>
        </View>
        <View style={styles.headerBalance} />
      </View>
      <View style={styles.identity}>
        {!isVideoCall || !remoteStreamUrl ? (
          <CallAvatarHalo
            animated={
              !isVideoCall &&
              (status === "calling" || status === "connecting")
            }
          >
            <UserAvatar
              displayName={displayName}
              imageUrl={avatarUrl}
              size={112}
              style={styles.avatar}
            />
          </CallAvatarHalo>
        ) : null}
      </View>
      {isVideoCall && localStreamUrl ? (
        <RTCView objectFit="cover" streamURL={localStreamUrl} style={styles.localVideo} zOrder={1} />
      ) : null}
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={isMicrophoneEnabled ? "Tắt micro" : "Bật micro"}
          onPress={toggleMicrophone}
          style={[styles.secondaryButton, !isMicrophoneEnabled && styles.controlDisabled]}
        >
          <Ionicons
            color={colors.white}
            name={isMicrophoneEnabled ? "mic" : "mic-off"}
            size={24}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={isSpeakerEnabled ? "Tắt loa ngoài" : "Bật loa ngoài"}
          onPress={() => setIsSpeakerEnabled((current) => !current)}
          style={[styles.secondaryButton, isSpeakerEnabled && styles.controlActive]}
        >
          <Ionicons
            color={colors.white}
            name={isSpeakerEnabled ? "volume-high" : "ear-outline"}
            size={24}
          />
        </Pressable>
        {isVideoCall ? (
          <>
            <Pressable
              accessibilityLabel={isCameraEnabled ? "Tắt camera" : "Bật camera"}
              onPress={toggleCamera}
              style={[styles.secondaryButton, !isCameraEnabled && styles.controlDisabled]}
            >
              <Ionicons
                color={colors.white}
                name={isCameraEnabled ? "videocam" : "videocam-off"}
                size={24}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Đổi camera"
              onPress={switchCamera}
              style={styles.secondaryButton}
            >
              <Ionicons color={colors.white} name="camera-reverse" size={24} />
            </Pressable>
          </>
        ) : null}
        <Pressable accessibilityLabel="Kết thúc cuộc gọi" onPress={end} style={styles.endButton}>
          <Ionicons color={colors.dangerContrast} name="call" size={28} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: {
    borderColor: colors.visuals.rgb_36_221_228_0_82,
    borderRadius: 56,
    borderWidth: 2,
    height: 112,
    width: 112,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 56,
    height: 112,
    justifyContent: "center",
    width: 112,
  },
  controls: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.md,
  },
  controlActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  controlDisabled: {
    backgroundColor: colors.visuals.rgb_255_84_112_0_28,
    borderColor: colors.danger,
  },
  endButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    shadowColor: colors.danger,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    transform: [{ rotate: "135deg" }],
    width: 60,
  },
  headerBalance: { height: 44, width: 44 },
  iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  identity: { alignItems: "center", flex: 1, gap: spacing.md, justifyContent: "center", paddingHorizontal: spacing.xl },
  localVideo: {
    backgroundColor: colors.text,
    borderColor: colors.visuals.rgb_255_255_255_0_55,
    borderRadius: 8,
    borderWidth: 1,
    height: 160,
    position: "absolute",
    right: spacing.lg,
    top: 96,
    width: 110,
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.text,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_14_28_49_0_72,
    borderColor: colors.borderSubtle,
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  videoHeaderInfo: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  videoHeaderName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    maxWidth: "100%",
  },
  videoHeaderStatus: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
});
