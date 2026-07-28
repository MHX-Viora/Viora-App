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
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { endGroupCall, joinGroupCall } from "@/services/group-call.service";
import { subscribeCallLifecycle } from "@/features/calls/call-events";
import { getUser } from "@/stores/session-store";
import { CallType, type GroupCallJoin } from "@/types/call";

type ControlProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
};

function Control({ active = true, danger, icon, label, onPress }: ControlProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.control, !active && styles.controlOff, danger && styles.controlDanger]}
    >
      <Ionicons color="#fff" name={icon} size={21} />
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
    if (room.remoteParticipants.size === 0) {
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

  const toggleSpeaker = async () => {
    const next = !isSpeaker;
    const outputs = await AudioSession.getAudioOutputs();
    const target = next ? "speaker" : "earpiece";
    if (outputs.includes(target)) await AudioSession.selectAudioOutput(target);
    setIsSpeaker(next);
  };

  const switchCamera = async () => {
    const next = !isFrontCamera;
    await localParticipant.setCameraEnabled(false);
    await localParticipant.setCameraEnabled(true, {
      facingMode: next ? "user" : "environment",
    });
    setIsFrontCamera(next);
  };

  return (
    <View style={styles.room}>
      <View style={styles.header}>
        <Text style={styles.title}>Cuộc gọi nhóm</Text>
        <Text style={styles.subtitle}>{tracks.length}/25 người tham gia</Text>
      </View>
      <FlatList
        key={tracks.length <= 1 ? "single-column" : "two-columns"}
        contentContainerStyle={styles.grid}
        data={tracks}
        keyExtractor={(item) =>
          `${item.participant.identity}-${item.source}`
        }
        numColumns={tracks.length <= 1 ? 1 : 2}
        renderItem={({ item }) => (
          <View style={styles.tile}>
            {isTrackReference(item) ? (
              <VideoTrack
                mirror={item.participant.isLocal}
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
          icon={isSpeaker ? "volume-high" : "ear"}
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
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const [join, setJoin] = useState<GroupCallJoin | null>(null);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void AudioSession.startAudioSession();
    void getUser().then((user) => {
      if (active) setUserId(user?.id ?? "");
    });
    void joinGroupCall(callId)
      .then((value) => active && setJoin(value))
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
        <Ionicons color="#ff5577" name="alert-circle" size={48} />
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
        <ActivityIndicator color="#30d5c8" size="large" />
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

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#18344c", flex: 1, justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 42, fontWeight: "800" },
  back: { backgroundColor: "#167f89", borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 },
  backText: { color: "#fff", fontWeight: "700" },
  center: { alignItems: "center", backgroundColor: "#071622", flex: 1, gap: 18, justifyContent: "center", padding: 28 },
  control: { alignItems: "center", backgroundColor: "#1b5160", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  controlDanger: { backgroundColor: "#e33d55" },
  controlOff: { backgroundColor: "#6d3547" },
  controls: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", paddingHorizontal: 6, paddingVertical: 14 },
  error: { color: "#fff", fontSize: 16, textAlign: "center" },
  grid: { flexGrow: 1, gap: 8, padding: 8 },
  header: { alignItems: "center", padding: 12 },
  loading: { color: "#b9cbd6" },
  name: { color: "#fff", fontSize: 12, fontWeight: "700" },
  nameBadge: { backgroundColor: "rgba(0,0,0,0.55)", bottom: 8, left: 8, maxWidth: "85%", paddingHorizontal: 8, paddingVertical: 5, position: "absolute" },
  room: { flex: 1 },
  screen: { backgroundColor: "#071622", flex: 1 },
  subtitle: { color: "#91a8b5", marginTop: 2 },
  tile: { aspectRatio: 0.78, backgroundColor: "#102536", borderRadius: 14, flex: 1, margin: 4, overflow: "hidden" },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  video: { flex: 1 },
});
