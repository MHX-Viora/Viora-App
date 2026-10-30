import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ChannelProfileType, ClientRoleType, ConnectionStateType, RemoteVideoState, RenderModeType, RtcSurfaceView, VideoMirrorModeType, VideoViewSetupMode, createAgoraRtcEngine, type IRtcEngine, type IRtcEngineEventHandler } from "react-native-agora";

import type { AudienceAgoraViewProps } from "./audience-agora-view";
import { audiencePresentationLayout, type VideoRect } from './live-presentation';

export function AudienceAgoraView({ access, presentation, style, onTokenWillExpire, onError, onPlaybackStateChange }: AudienceAgoraViewProps) {
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const frame = presentation ? audiencePresentationLayout(stage, presentation) : null;
  const [hostUid, setHostUid] = useState<number | null>(null);
  const engineRef = useRef<IRtcEngine | null>(null);
  const joined = useRef(false);
  const renewedToken = useRef(access.token);
  const latestToken = useRef(access.token);
  latestToken.current = access.token;
  const callbacks = useRef({ onTokenWillExpire, onError, onPlaybackStateChange });
  callbacks.current = { onTokenWillExpire, onError, onPlaybackStateChange };

  useEffect(() => {
    const engine = createAgoraRtcEngine();
    engineRef.current = engine;
    joined.current = false;
    renewedToken.current = access.token;
    let disposed = false;
    const context = { appId: access.appId, channel: access.channelName, uid: access.uid, role: "audience", tokenRole: access.role };
    const log = (event: string, details?: Record<string, unknown>) => { if (__DEV__) console.info(`[Live][Viewer][Agora] ${event}`, { ...context, ...details }); };
    const report = (state: Parameters<NonNullable<AudienceAgoraViewProps["onPlaybackStateChange"]>>[0]) => { if (!disposed) callbacks.current.onPlaybackStateChange?.(state); };
    const fail = (code: string | number) => {
      if (disposed) return;
      console.error("[Live][Viewer][Agora] failed", { ...context, code });
      report("error"); callbacks.current.onError();
    };
    setHostUid(null);
    report("connecting");
    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: (_connection, elapsed) => {
        if (disposed) return;
        joined.current = true;
        log("joined", { elapsed }); report("waitingForHost");
        if (latestToken.current !== renewedToken.current) {
          const result = engine.renewToken(latestToken.current);
          if (result !== 0) fail(result); else renewedToken.current = latestToken.current;
        }
      },
      onUserJoined: (_connection, uid) => { if (!disposed) { log("user-joined", { remoteUid: uid }); setHostUid(uid); } },
      onUserOffline: (_connection, uid) => { if (!disposed) { setHostUid((current) => current === uid ? null : current); report("waitingForHost"); } },
      onFirstRemoteVideoFrame: (_connection, uid, width, height) => { if (!disposed) { setVideoSize({ width, height }); setHostUid(uid); report("playing"); log("first remote frame", { remoteUid: uid }); } },
      onVideoSizeChanged: (_connection, _source, _uid, width, height) => { if (!disposed) setVideoSize({ width, height }); },
      onRemoteVideoStateChanged: (_connection, uid, state) => {
        if (disposed) return;
        log("remote-video-state", { remoteUid: uid, state });
        if (state === RemoteVideoState.RemoteVideoStateDecoding) { setHostUid(uid); report("playing"); }
        else if (state === RemoteVideoState.RemoteVideoStateStopped) { setHostUid((current) => current === uid ? null : current); report("waitingForHost"); }
        else if (state === RemoteVideoState.RemoteVideoStateFrozen) report("reconnecting");
        else if (state === RemoteVideoState.RemoteVideoStateFailed) fail("REMOTE_VIDEO_FAILED");
        else setHostUid(uid);
      },
      onConnectionStateChanged: (_connection, state) => {
        log("connection-state-change", { state });
        if (state === ConnectionStateType.ConnectionStateReconnecting) report("reconnecting");
        else if (state === ConnectionStateType.ConnectionStateConnected) report("waitingForHost");
        else if (state === ConnectionStateType.ConnectionStateFailed) fail("CONNECTION_FAILED");
      },
      onTokenPrivilegeWillExpire: () => { if (!disposed) callbacks.current.onTokenWillExpire(); },
      onRequestToken: () => { if (!disposed) callbacks.current.onTokenWillExpire(); },
      onError: (code) => fail(code),
    };
    try {
      const initialized = engine.initialize({ appId: access.appId, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
      if (initialized !== 0) throw new Error(`Agora initialize failed: ${initialized}`);
      engine.registerEventHandler(handler);
      engine.enableVideo();
      engine.enableAudio();
      engine.setClientRole(ClientRoleType.ClientRoleAudience);
      log("joining");
      const result = engine.joinChannel(latestToken.current, access.channelName, access.uid, {
        clientRoleType: ClientRoleType.ClientRoleAudience,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
        publishCameraTrack: false,
        publishMicrophoneTrack: false,
      });
      if (result !== 0) fail(result);
    } catch { fail("RTC_INITIALIZATION_FAILED"); }
    return () => {
      disposed = true;
      if (engineRef.current === engine) engineRef.current = null;
      engine.unregisterEventHandler(handler);
      engine.leaveChannel();
      engine.release();
    };
    // Token rotation keeps the same channel and rendered surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.appId, access.channelName, access.uid]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !joined.current || renewedToken.current === access.token) return;
    try {
      const result = engine.renewToken(access.token);
      if (result !== 0) throw new Error("Agora token renewal failed");
      renewedToken.current = access.token;
    } catch {
      console.error("[Live][Viewer][Agora] token renewal failed");
      callbacks.current.onPlaybackStateChange?.("error");
      callbacks.current.onError();
    }
  }, [access.token]);

  const cropArea = (crop: VideoRect) => {
    const sx = frame && videoSize.width ? videoSize.width / frame.packed.width : 1;
    const sy = frame && videoSize.height ? videoSize.height / frame.packed.height : 1;
    return { x: Math.round(crop.left * sx), y: Math.round(crop.top * sy), width: Math.round(crop.width * sx), height: Math.round(crop.height * sy) };
  };
  const canvas = { uid: hostUid ?? 0, mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled, renderMode: RenderModeType.RenderModeFit, setupMode: VideoViewSetupMode.VideoViewSetupAdd };
  return <View style={style} onLayout={event => setStage(event.nativeEvent.layout)}>{hostUid !== null ? frame ? <>
    <RtcSurfaceView key="packed-screen" canvas={{ ...canvas, cropArea: cropArea(frame.packed.screen) }} style={{ position: 'absolute', ...frame.screen }} />
    {frame.camera ? <View testID="audience-camera" style={{ position: 'absolute', ...frame.camera, overflow: 'hidden', borderRadius: 12 }}><RtcSurfaceView canvas={{ ...canvas, cropArea: cropArea(frame.packed.camera) }} style={{ flex: 1 }} /></View> : null}
  </> : <RtcSurfaceView key="legacy-video" canvas={canvas} style={{ flex: 1 }} /> : null}</View>;
}
