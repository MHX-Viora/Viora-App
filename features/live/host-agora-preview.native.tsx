import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import {
  ChannelProfileType, ClientRoleType, DegradationPreference, OrientationMode, RenderModeType,
  RtcSurfaceView, StreamPublishState, VideoMirrorModeType, VideoSourceType,
  createAgoraRtcEngine, type IRtcEngine, type IRtcEngineEventHandler,
} from "react-native-agora";

import type { HostAgoraPreviewHandle, HostAgoraPreviewProps } from "./host-agora-preview";
import { gameStreamLayout, type GameCameraPosition } from './game-stream-layout';
import { GameCameraDrag } from './game-camera-drag';
import { describeGamePresentation, packedGameFrame } from './live-presentation';
import { getHostVideoFrame } from './host-video-frame';
import { startGameCaptureService, stopGameCaptureService } from './game-capture-service.native';

export const HostAgoraPreview = forwardRef<HostAgoraPreviewHandle, HostAgoraPreviewProps>(function HostAgoraPreview(props, ref) {
  const engine = useRef<IRtcEngine | null>(null);
  const callbacks = useRef(props);
  const publishWaiter = useRef<{ resolve: () => void; reject: (reason: Error) => void } | null>(null);
  const lastFacing = useRef(props.facing);
  const [screenSharing, setScreenSharing] = useState(false);
  const sharing = useRef(false);
  const joined = useRef(false);
  const layout = useRef(gameStreamLayout(1280, 720));
  const cameraPosition = useRef<GameCameraPosition | undefined>(undefined);
  const [dragLayout, setDragLayout] = useState(layout.current);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const screenWaiter = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null);
  const stopCapture = useRef<() => void>(() => {});
  callbacks.current = props;

  const mixConfiguration = useCallback(() => ({
    streamCount: callbacks.current.cameraOn ? 2 : 1,
    videoInputStreams: [
      { sourceType: VideoSourceType.VideoSourceScreenPrimary, x: 0, y: 0, width: layout.current.width, height: layout.current.height, zOrder: 0 },
      ...(callbacks.current.cameraOn ? [{ sourceType: VideoSourceType.VideoSourceCameraPrimary, x: 0, y: layout.current.height, width: layout.current.inset.width, height: layout.current.inset.height, zOrder: 1, mirror: false }] : []),
    ],
    videoOutputConfiguration: { dimensions: { width: packedGameFrame(layout.current).width, height: packedGameFrame(layout.current).height }, frameRate: 30, bitrate: 3500, orientationMode: OrientationMode.OrientationModeAdaptive },
  }), []);
  stopCapture.current = () => {
    const rtc = engine.current;
    const wasSharing = sharing.current; sharing.current = false;
    if (wasSharing) publishWaiter.current?.reject(new Error('Chia sẻ màn hình đã dừng trước khi phát Live.'));
    screenWaiter.current?.reject(new Error('Đã dừng chia sẻ màn hình.'));
    rtc?.stopLocalVideoTranscoder(); rtc?.stopScreenCapture(); rtc?.enableLocalVideo(callbacks.current.cameraOn);
    if (joined.current && rtc?.updateChannelMediaOptions({ publishCameraTrack: callbacks.current.cameraOn, publishTranscodedVideoTrack: false, publishScreenCaptureVideo: false }) !== 0) callbacks.current.onError();
    stopGameCaptureService();
    setScreenSharing(false);
    if (wasSharing) callbacks.current.onScreenShareChanged?.(false);
  };
  const failCapture = useCallback(() => {
    const wasSharing = sharing.current;
    stopCapture.current();
    if (wasSharing) callbacks.current.onScreenShareError?.();
  }, []);
  const updateComposition = useCallback(() => {
    const rtc = engine.current;
    if (!rtc || !sharing.current) return;
    if (rtc.updateLocalTranscoderConfiguration(mixConfiguration()) !== 0 ||
      (joined.current && rtc.updateChannelMediaOptions({ publishCameraTrack: false, publishScreenCaptureVideo: false, publishTranscodedVideoTrack: true }) !== 0)) failCapture();
  }, [mixConfiguration, failCapture]);

  useEffect(() => {
    if (!props.appId) return;
    const instance = createAgoraRtcEngine();
    const handler: IRtcEngineEventHandler = {
      onFirstLocalVideoFrame: (source, width, height) => {
        if (source === VideoSourceType.VideoSourceScreenPrimary && screenWaiter.current) {
          layout.current = gameStreamLayout(width, height, cameraPosition.current);
          setDragLayout(layout.current);
          const code = instance.startLocalVideoTranscoder(mixConfiguration());
          if (code !== 0) { stopCapture.current(); return; }
          if (joined.current && instance.updateChannelMediaOptions({ publishCameraTrack: false, publishScreenCaptureVideo: false, publishTranscodedVideoTrack: true }) !== 0) { stopCapture.current(); return; }
          sharing.current = true; setScreenSharing(true); callbacks.current.onScreenShareChanged?.(true); screenWaiter.current.resolve();
        } else if (source === VideoSourceType.VideoSourceCameraPrimary || source === VideoSourceType.VideoSourceTranscoded) callbacks.current.onReady();
      },
      onVideoSizeChanged: (_connection, source, _uid, width, height) => {
        if (source === VideoSourceType.VideoSourceScreenPrimary && sharing.current) { layout.current = gameStreamLayout(width, height, cameraPosition.current); setDragLayout(layout.current); updateComposition(); }
      },
      onLocalVideoStateChanged: (source, state) => {
        if (source === VideoSourceType.VideoSourceScreenPrimary && (state === 0 || state === 3) && (sharing.current || screenWaiter.current)) stopCapture.current();
      },
      onPermissionError: () => { if (screenWaiter.current) stopCapture.current(); },
      onLocalVideoTranscoderError: () => { if (screenWaiter.current || sharing.current) failCapture(); },
      onFirstLocalVideoFramePublished: () => { if (__DEV__) console.info("[Live][Host][Agora] first local frame published"); if (!sharing.current) publishWaiter.current?.resolve(); },
      onJoinChannelSuccess: (connection) => { joined.current = true; if (__DEV__) console.info("[Live][Host][Agora] joined", { uid: connection.localUid, channel: connection.channelId }); },
      onVideoPublishStateChanged: (source, _channel, _oldState, newState) => {
        const activeSource = sharing.current ? VideoSourceType.VideoSourceTranscoded : VideoSourceType.VideoSourceCameraPrimary;
        if (source === activeSource && newState === StreamPublishState.PubStatePublished) publishWaiter.current?.resolve();
      },
      onError: (code) => { console.error("[Live][Host][Agora] failed", { code }); callbacks.current.onError(); publishWaiter.current?.reject(new Error("Agora không thể phát video.")); },
      onTokenPrivilegeWillExpire: () => callbacks.current.onTokenWillExpire(),
      onRequestToken: () => callbacks.current.onTokenWillExpire(),
    };
    try {
      instance.initialize({ appId: props.appId, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
      instance.registerEventHandler(handler);
      instance.enableVideo();
      instance.enableAudio();
      instance.setVideoEncoderConfiguration({
        bitrate: 5000,
        degradationPreference: DegradationPreference.MaintainBalanced,
        dimensions: { height: 1080, width: 1920 },
        frameRate: 60,
        minBitrate: 1500,
        mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled,
        orientationMode: OrientationMode.OrientationModeAdaptive,
      });
      instance.setCameraCapturerConfiguration({ followEncodeDimensionRatio: true });
      instance.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      instance.startPreview();
      engine.current = instance;
    } catch (error) {
      console.error("[Live][Host][Agora] initialize failed", error);
      callbacks.current.onError();
    }
    return () => {
      screenWaiter.current?.reject(new Error('Đã đóng màn hình Live.'));
      if (sharing.current) { sharing.current = false; callbacks.current.onScreenShareChanged?.(false); }
      joined.current = false;
      instance.stopLocalVideoTranscoder(); instance.stopScreenCapture();
      stopGameCaptureService();
      publishWaiter.current?.reject(new Error("Đã đóng camera Live."));
      publishWaiter.current = null;
      instance.unregisterEventHandler(handler);
      instance.leaveChannel();
      instance.stopPreview();
      instance.release();
      engine.current = null;
    };
  }, [props.appId, mixConfiguration, updateComposition, failCapture]);

  useEffect(() => {
    if (!engine.current || lastFacing.current === props.facing) return;
    lastFacing.current = props.facing;
    engine.current.switchCamera();
  }, [props.facing]);
  useEffect(() => {
    const rtc = engine.current;
    if (!rtc) return;
    // Capture must match the inset preference; reapply publication after capture changes.
    if (rtc.enableLocalVideo(props.cameraOn) !== 0 && sharing.current) { failCapture(); return; }
    if (sharing.current) updateComposition();
    else if (joined.current && rtc.updateChannelMediaOptions({ publishCameraTrack: props.cameraOn }) !== 0) callbacks.current.onError();
  }, [props.cameraOn, updateComposition, failCapture]);
  useEffect(() => { engine.current?.enableLocalAudio(props.microphoneOn); }, [props.microphoneOn]);
  useEffect(() => { callbacks.current.onPresentationChanged?.(screenSharing ? describeGamePresentation(dragLayout, props.cameraOn) : null); }, [screenSharing, dragLayout, props.cameraOn]);

  useImperativeHandle(ref, () => ({
    async join(access) {
      const rtc = engine.current;
      if (!rtc) throw new Error("Camera Agora chưa sẵn sàng.");
      if (access.appId !== callbacks.current.appId || access.role !== "broadcaster") throw new Error("Thông tin kênh phát Live không hợp lệ.");
      if (__DEV__) console.info("[Live][Host][Agora] joining/publishing", { appId: access.appId, channel: access.channelName, uid: access.uid, role: access.role });
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { publishWaiter.current = null; reject(new Error("Không thể phát Live. Vui lòng thử lại.")); }, 15000);
        publishWaiter.current = {
          resolve: () => { clearTimeout(timer); publishWaiter.current = null; resolve(); },
          reject: (error) => { clearTimeout(timer); publishWaiter.current = null; reject(error); },
        };
        const code = rtc.joinChannel(access.token, access.channelName, access.uid, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
          publishCameraTrack: !sharing.current, publishMicrophoneTrack: true,
          publishTranscodedVideoTrack: sharing.current, publishScreenCaptureVideo: false,
        });
        if (code !== 0) publishWaiter.current?.reject(new Error("Không thể vào kênh Agora."));
      });
    },
    async renew(token) {
      const code = engine.current?.renewToken(token);
      if (code !== 0) throw new Error("Không thể gia hạn kết nối Live.");
    },
    async leave() { if (sharing.current || screenWaiter.current) stopCapture.current(); joined.current = false; engine.current?.leaveChannel(); },
    async shareScreen() {
      const rtc = engine.current; if (!rtc) throw new Error('Thiết bị chưa sẵn sàng.');
      if (sharing.current || screenWaiter.current) return;
      startGameCaptureService();
      try { await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { stopCapture.current(); reject(new Error('Chưa nhận được quyền quay màn hình. Vui lòng thử lại.')); }, 30_000);
        screenWaiter.current = { resolve: () => { clearTimeout(timer); screenWaiter.current = null; resolve(); }, reject: error => { clearTimeout(timer); screenWaiter.current = null; reject(error); } };
        const code = rtc.startScreenCapture({ captureVideo: true, captureAudio: false, videoParams: { dimensions: { width: 1280, height: 720 }, frameRate: 30, bitrate: 3500 } });
        if (code !== 0) screenWaiter.current?.reject(new Error('Thiết bị chưa hỗ trợ chia sẻ màn hình hoặc thiếu quyền.'));
      }); } catch (error) { stopCapture.current(); throw error; }
    },
    async stopScreenShare() { stopCapture.current(); },
  }), []);

  const frame = getHostVideoFrame(stageSize, dragLayout);
  return <View style={props.style} onLayout={event => setStageSize(event.nativeEvent.layout)}><><RtcSurfaceView canvas={{ uid: 0, sourceType: screenSharing ? VideoSourceType.VideoSourceScreenPrimary : VideoSourceType.VideoSourceCameraPrimary, mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled, renderMode: screenSharing ? RenderModeType.RenderModeFit : RenderModeType.RenderModeHidden }} style={{ flex: 1 }} />
    {screenSharing && props.cameraOn && frame ? <View pointerEvents="none" style={{ position: 'absolute', overflow: 'hidden', borderRadius: 12, left: frame.left + dragLayout.inset.x * frame.width / dragLayout.width, top: frame.top + dragLayout.inset.y * frame.height / dragLayout.height, width: dragLayout.inset.width * frame.width / dragLayout.width, height: dragLayout.inset.height * frame.height / dragLayout.height }}><RtcSurfaceView canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCameraPrimary, renderMode: RenderModeType.RenderModeHidden, mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled }} style={{ flex: 1 }} /></View> : null}</>
    {screenSharing && props.cameraOn ? <GameCameraDrag layout={dragLayout} onMove={position => {
      if (!sharing.current) return;
      cameraPosition.current = position;
      layout.current = gameStreamLayout(layout.current.width, layout.current.height, position);
      setDragLayout(layout.current);
      if (engine.current?.updateLocalTranscoderConfiguration(mixConfiguration()) !== 0) failCapture();
    }} /> : null}
  </View>;
});
