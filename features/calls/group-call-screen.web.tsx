import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Room, RoomEvent, Track, type TrackPublication } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { endGroupCall, joinGroupCall } from "@/services/group-call.service";
import { getUser } from "@/stores/session-store";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import { CallType } from "@/types/call";

type VideoPublication = TrackPublication & { participantName: string; isLocal?: boolean };

function VideoTile({ publication, styles }: { publication: VideoPublication; styles: ReturnType<typeof createStyles> }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const track = publication.track;
    const element = ref.current;
    if (!track || !element) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [publication]);
  return <View style={styles.tile}><video autoPlay muted={publication.isLocal} playsInline ref={ref} style={styles.video as never} /><Text numberOfLines={1} style={styles.tileName}>{publication.participantName}{publication.isLocal ? " (Bạn)" : ""}</Text></View>;
}

function AudioTrack({ publication }: { publication: TrackPublication }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const track = publication.track;
    const element = ref.current;
    if (!track || !element) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [publication]);
  return <audio autoPlay ref={ref} />;
}

export function GroupCallScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { callId = "" } = useLocalSearchParams<{ callId?: string }>();
  const roomRef = useRef<Room | null>(null);
  const leftRef = useRef(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [canEnd, setCanEnd] = useState(false);
  const [videos, setVideos] = useState<VideoPublication[]>([]);
  const [audioTracks, setAudioTracks] = useState<TrackPublication[]>([]);

  const back = useCallback(() => router.back(), []);
  const syncVideos = useCallback((next: Room) => {
    const entries: VideoPublication[] = [];
    const audio: TrackPublication[] = [];
    const append = (publication: TrackPublication, participantName: string, isLocal = false) => {
      if (publication.source === Track.Source.Camera && publication.track) entries.push(Object.assign(publication, { participantName, isLocal }));
      if (publication.source === Track.Source.Microphone && publication.track && !isLocal) audio.push(publication);
    };
    next.remoteParticipants.forEach((participant) => participant.trackPublications.forEach((publication) => append(publication, participant.name || participant.identity)));
    next.localParticipant.trackPublications.forEach((publication) => append(publication, next.localParticipant.name || "Bạn", true));
    setVideos(entries);
    setAudioTracks(audio);
  }, []);
  const leave = useCallback(async (endForEveryone = false) => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (endForEveryone || roomRef.current?.remoteParticipants.size === 0) await endGroupCall(callId).catch(() => undefined);
    roomRef.current?.disconnect(); roomRef.current = null; back();
  }, [back, callId]);

  useEffect(() => {
    if (!callId) { back(); return; }
    let mounted = true;
    void (async () => {
      try {
        const join = await joinGroupCall(callId);
        const next = new Room({ adaptiveStream: true, dynacast: true });
        next.on(RoomEvent.TrackSubscribed, () => syncVideos(next));
        next.on(RoomEvent.TrackUnsubscribed, () => syncVideos(next));
        next.on(RoomEvent.ParticipantConnected, () => syncVideos(next));
        next.on(RoomEvent.ParticipantDisconnected, () => syncVideos(next));
        next.on(RoomEvent.LocalTrackPublished, () => syncVideos(next));
        next.on(RoomEvent.LocalTrackUnpublished, () => syncVideos(next));
        next.on(RoomEvent.Disconnected, () => { if (!leftRef.current) back(); });
        await next.connect(join.liveKitUrl, join.token);
        await next.localParticipant.setMicrophoneEnabled(true);
        if (join.call.callType === CallType.Video) await next.localParticipant.setCameraEnabled(true);
        if (!mounted) { next.disconnect(); return; }
        roomRef.current = next; setRoom(next); setMicOn(true); setCameraOn(join.call.callType === CallType.Video);
        setCanEnd(join.call.startedBy.id === (await getUser())?.id); syncVideos(next);
      } catch (reason) {
        if (mounted) setError(reason instanceof Error ? reason.message : "Không thể tham gia cuộc gọi nhóm.");
      }
    })();
    return () => { mounted = false; roomRef.current?.disconnect(); roomRef.current = null; };
  }, [back, callId, syncVideos]);

  const toggleMic = async () => { if (!room) return; const next = !micOn; await room.localParticipant.setMicrophoneEnabled(next); setMicOn(next); };
  const toggleCamera = async () => { if (!room) return; const next = !cameraOn; await room.localParticipant.setCameraEnabled(next); setCameraOn(next); syncVideos(room); };
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable style={styles.back} onPress={back}><Text style={styles.backText}>Quay lại</Text></Pressable></View>;
  if (!room) return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.loading}>Đang vào cuộc gọi…</Text></View>;
  return <View style={styles.screen}>
    <View style={styles.header}><Text style={styles.title}>Cuộc gọi nhóm</Text><Text style={styles.subtitle}>{room.remoteParticipants.size + 1} người tham gia</Text></View>
    {audioTracks.map((publication) => <AudioTrack key={publication.trackSid} publication={publication} />)}
    <View style={styles.grid}>{videos.length ? videos.map((publication) => <VideoTile key={`${publication.participantName}-${publication.trackSid}`} publication={publication} styles={styles} />) : <Text style={styles.loading}>Đang chờ người tham gia…</Text>}</View>
    <View style={styles.controls}>
      <Pressable accessibilityLabel="Bật/tắt mic" style={styles.control} onPress={() => void toggleMic()}><Ionicons color={colors.text} name={micOn ? "mic" : "mic-off"} size={24} /></Pressable>
      <Pressable accessibilityLabel="Bật/tắt camera" style={styles.control} onPress={() => void toggleCamera()}><Ionicons color={colors.text} name={cameraOn ? "videocam" : "videocam-off"} size={24} /></Pressable>
      <Pressable accessibilityLabel="Rời cuộc gọi" style={[styles.control, styles.danger]} onPress={() => void leave()}><Ionicons color={colors.dangerContrast} name="call" size={24} /></Pressable>
      {canEnd && <Pressable accessibilityLabel="Kết thúc cuộc gọi" style={[styles.control, styles.danger]} onPress={() => void leave(true)}><Ionicons color={colors.dangerContrast} name="stop-circle" size={24} /></Pressable>}
    </View>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1, padding: spacing.lg }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl },
  header: { alignItems: "center", paddingVertical: spacing.md }, title: { color: colors.text, fontSize: 21, fontWeight: "800" }, subtitle: { color: colors.textMuted, marginTop: spacing.xs },
  grid: { alignContent: "center", flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }, tile: { backgroundColor: colors.surface, borderRadius: 14, height: "46%", maxWidth: "48%", minWidth: "42%", overflow: "hidden" }, video: { backgroundColor: colors.background, height: "100%", objectFit: "cover", width: "100%" }, tileName: { backgroundColor: colors.overlay, bottom: 0, color: colors.white, left: 0, padding: 7, position: "absolute", right: 0 },
  controls: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center", paddingVertical: spacing.md }, control: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 26, height: 52, justifyContent: "center", width: 52 }, danger: { backgroundColor: colors.danger }, loading: { color: colors.textMuted }, error: { color: colors.text, textAlign: "center" }, back: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }, backText: { color: colors.primaryContrast, fontWeight: "700" },
});
