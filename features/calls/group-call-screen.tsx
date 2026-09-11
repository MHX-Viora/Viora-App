import Ionicons from "@expo/vector-icons/Ionicons";
import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Track } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { endGroupCall, joinGroupCall } from "@/services/group-call.service";
import { setCallScreenActive } from "@/services/incoming-call-settings.service";
import { subscribeCallLifecycle } from "@/features/calls/call-events";
import { getGroupCallColumnCount } from "@/features/calls/group-call-layout";
import { shouldEndGroupCallOnLocalExit } from "@/features/calls/group-call-lifecycle";
import { requestCallMediaPermissions } from "@/services/webrtc-call.service";
import { getUser } from "@/stores/session-store";
import { type ThemeColors, useTheme } from "@/theme";
import { CallType, type GroupCallJoin } from "@/types/call";

type ControlProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
};

function Control({ active = true, danger, icon, label, onPress }: ControlProps) {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.control, !active && styles.controlOff, danger && styles.controlDanger]}
    >
      <Ionicons
        color={
          danger
            ? colors.dangerContrast
            : active
              ? colors.primaryContrast
              : colors.background
        }
        name={icon}
        size={21}
      />
    </Pressable>
  );
}

function RoomContent({
  canEnd,
  callId,
  isVideo,
}: {
  canEnd: boolean;
  callId: string;
  isVideo: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const room = useRoomContext();
  const { isCameraEnabled, isMicrophoneEnabled, localParticipant } =
    useLocalParticipant();
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const hasLeft = useRef(false);
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const leave = useCallback(async () => {
    if (hasLeft.current) return;
    hasLeft.current = true;
    if (shouldEndGroupCallOnLocalExit(room.remoteParticipants.size)) {
      await endGroupCall(callId).catch(() => undefined);
    }
    router.back();
  }, [callId, room]);

  const end = async () => {
    await endGroupCall(callId).catch(() => undefined);
    await leave();
  };

  useEffect(
    () =>
      subscribeCallLifecycle((event) => {
        if (
          event.callId === callId &&
          event.eventName === "GroupCallEnded"
        ) {
          void leave();
        }
      }),
    [callId, leave],
  );

  useEffect(() => {
    return () => {
      if (hasLeft.current) return;
      hasLeft.current = true;
      if (shouldEndGroupCallOnLocalExit(room.remoteParticipants.size)) {
        void endGroupCall(callId).catch(() => undefined);
      }
    };
  }, [callId, room]);

  const toggleSpeaker = async () => {
    const next = !isSpeaker;
    const outputs = await AudioSession.getAudioOutputs();
    const target = next ? "speaker" : "earpiece";
    if (outputs.includes(target)) await AudioSession.selectAudioOutput(target);
    setIsSpeaker(next);
  };

  const switchCamera = async () => {
    const next = !isFrontCamera;
    try {
      const cameraTrack = localParticipant.getTrackPublication(
        Track.Source.Camera,
      )?.videoTrack;
      if (cameraTrack) {
        await cameraTrack.restartTrack({
          facingMode: next ? "user" : "environment",
        });
      } else {
        await localParticipant.setCameraEnabled(true, {
          facingMode: next ? "user" : "environment",
        });
      }
      setIsFrontCamera(next);
    } catch (error) {
      Alert.alert(
        "Không thể đổi camera",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  return (
    <View style={styles.room}>
      <View style={styles.header}>
        <Text style={styles.title}>Cuộc gọi nhóm</Text>
        <Text style={styles.subtitle}>{tracks.length}/25 người tham gia</Text>
      </View>
      <FlatList
        contentContainerStyle={styles.grid}
        data={tracks}
        keyExtractor={(item) =>
          `${item.participant.identity}-${item.source}`
        }
        numColumns={getGroupCallColumnCount(tracks.length)}
        renderItem={({ item }) => (
          <View style={styles.tile}>
            {isTrackReference(item) ? (
              <VideoTrack
                mirror={item.participant.isLocal && isFrontCamera}
                objectFit="cover"
                style={styles.video}
                trackRef={item}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.participant.name || item.participant.identity)
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.nameBadge}>
              <Text numberOfLines={1} style={styles.name}>
                {item.participant.name || "Thành viên"}
                {item.participant.isLocal ? " (Bạn)" : ""}
              </Text>
            </View>
          </View>
        )}
      />
      <View style={styles.controls}>
        <Control
          active={isMicrophoneEnabled}
          icon={isMicrophoneEnabled ? "mic" : "mic-off"}
          label={isMicrophoneEnabled ? "Tắt mic" : "Bật mic"}
          onPress={() =>
            void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
          }
        />
        {isVideo && (
          <>
            <Control
              active={isCameraEnabled}
              icon={isCameraEnabled ? "videocam" : "videocam-off"}
              label={isCameraEnabled ? "Tắt camera" : "Bật camera"}
              onPress={() =>
                void localParticipant.setCameraEnabled(!isCameraEnabled)
              }
            />
            <Control
              icon="camera-reverse"
              label="Đổi camera"
              onPress={() => void switchCamera()}
            />
          </>
        )}
        <Control
          active={isSpeaker}
          icon={isSpeaker ? "volume-high" : "volume-mute"}
          label={isSpeaker ? "Dùng loa thoại" : "Bật loa ngoài"}
          onPress={() => void toggleSpeaker()}
        />
        <Control danger icon="call" label="Rời cuộc gọi" onPress={() => void leave()} />
        {canEnd && (
          <Control
            danger
            icon="stop-circle"
            label="Kết thúc cho mọi người"
            onPress={() => void end()}
          />
        )}
      </View>
    </View>
  );
}

export function GroupCallScreen() {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const [join, setJoin] = useState<GroupCallJoin | null>(null);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCallScreenActive(true);
    return () => setCallScreenActive(false);
  }, []);

  useEffect(() => {
    let active = true;
    void AudioSession.startAudioSession();
    void getUser().then((user) => {
      if (active) setUserId(user?.id ?? "");
    });
    void requestCallMediaPermissions(false)
      .then(() => joinGroupCall(callId))
      .then(async (value) => {
        await requestCallMediaPermissions(value.call.callType === CallType.Video);
        if (active) setJoin(value);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Không thể tham gia.");
      });
    return () => {
      active = false;
      void AudioSession.stopAudioSession();
    };
  }, [callId]);

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons color={colors.danger} name="alert-circle" size={48} />
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>Quay lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  if (!join) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loading}>Đang kết nối cuộc gọi...</Text>
      </SafeAreaView>
    );
  }
  const isVideo = join.call.callType === CallType.Video;
  return (
    <SafeAreaView style={styles.screen}>
      <LiveKitRoom
        audio
        connect
        options={{ adaptiveStream: true, dynacast: true }}
        serverUrl={join.liveKitUrl}
        token={join.token}
        video={isVideo}
      >
        <RoomContent
          callId={join.call.id}
          canEnd={join.call.startedBy.id === userId}
          isVideo={isVideo}
        />
      </LiveKitRoom>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: colors.surface, flex: 1, justifyContent: "center" },
  avatarText: { color: colors.white, fontSize: 42, fontWeight: "800" },
  back: { backgroundColor: colors.primaryPressed, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 },
  backText: { color: colors.primaryContrast, fontWeight: "700" },
  center: { alignItems: "center", backgroundColor: colors.reelBackground, flex: 1, gap: 18, justifyContent: "center", padding: 28 },
  control: { alignItems: "center", backgroundColor: colors.primaryPressed, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  controlDanger: { backgroundColor: colors.danger },
  controlOff: { backgroundColor: colors.textMuted },
  controls: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", paddingHorizontal: 6, paddingVertical: 14 },
  error: { color: colors.white, fontSize: 16, textAlign: "center" },
  grid: { flexGrow: 1, gap: 8, padding: 8 },
  header: { alignItems: "center", padding: 12 },
  loading: { color: colors.textMuted },
  name: { color: colors.white, fontSize: 12, fontWeight: "700" },
  nameBadge: { backgroundColor: colors.overlay, bottom: 8, left: 8, maxWidth: "85%", paddingHorizontal: 8, paddingVertical: 5, position: "absolute" },
  room: { flex: 1 },
  screen: { backgroundColor: colors.reelBackground, flex: 1 },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  tile: { aspectRatio: 0.78, backgroundColor: colors.surface, borderRadius: 14, flex: 1, margin: 4, overflow: "hidden" },
  title: { color: colors.white, fontSize: 20, fontWeight: "800" },
  video: { flex: 1 },
});
