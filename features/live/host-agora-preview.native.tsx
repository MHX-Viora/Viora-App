import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import {
  ChannelProfileType, ClientRoleType, DegradationPreference, OrientationMode, RenderModeType,
  RtcSurfaceView, StreamPublishState, VideoMirrorModeType, VideoSourceType,
  createAgoraRtcEngine, type IRtcEngine, type IRtcEngineEventHandler,
} from "react-native-agora";

import type { HostAgoraPreviewHandle, HostAgoraPreviewProps } from "./host-agora-preview";
import { gameStreamLayout } from './game-stream-layout';
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
  const screenWaiter = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null);
  const stopCapture = useRef<() => void>(() => {});
  callbacks.current = props;

  const mixConfiguration = () => ({
    streamCount: callbacks.current.cameraOn ? 2 : 1,
    videoInputStreams: [
      { sourceType: VideoSourceType.VideoSourceScreenPrimary, x: 0, y: 0, width: layout.current.width, height: layout.current.height, zOrder: 0 },
      ...(callbacks.current.cameraOn ? [{ sourceType: VideoSourceType.VideoSourceCameraPrimary, ...layout.current.inset, zOrder: 1, mirror: false }] : []),
    ],
    videoOutputConfiguration: { dimensions: { width: layout.current.width, height: layout.current.height }, frameRate: 30, bitrate: 3500, orientationMode: layout.current.width >= layout.current.height ? OrientationMode.OrientationModeFixedLandscape : OrientationMode.OrientationModeFixedPortrait },
  });
  stopCapture.current = () => {
    const rtc = engine.current;
    const wasSharing = sharing.current; sharing.current = false;
    screenWaiter.current?.reject(new Error('Đã dừng chia sẻ màn hình.'));
    if (joined.current) rtc?.updateChannelMediaOptions({ publishCameraTrack: true, publishTranscodedVideoTrack: false, publishScreenCaptureVideo: false });
    rtc?.stopLocalVideoTranscoder(); rtc?.stopScreenCapture(); rtc?.enableLocalVideo(callbacks.current.cameraOn);
    stopGameCaptureService();
    setScreenSharing(false);
    if (wasSharing) callbacks.current.onScreenShareChanged?.(false);
  };

  useEffect(() => {
    if (!props.appId) return;
    const instance = createAgoraRtcEngine();
    const handler: IRtcEngineEventHandler = {
      onFirstLocalVideoFrame: (source, width, height) => {
        if (source === VideoSourceType.VideoSourceScreenPrimary && screenWaiter.current) {
          layout.current = gameStreamLayout(width, height);
          const code = instance.startLocalVideoTranscoder(mixConfiguration());
          if (code !== 0) { stopCapture.current(); return; }
          if (joined.current && instance.updateChannelMediaOptions({ publishCameraTrack: false, publishScreenCaptureVideo: false, publishTranscodedVideoTrack: true }) !== 0) { stopCapture.current(); return; }
          sharing.current = true; setScreenSharing(true); callbacks.current.onScreenShareChanged?.(true); screenWaiter.current.resolve();
        } else if (source === VideoSourceType.VideoSourceCameraPrimary || source === VideoSourceType.VideoSourceTranscoded) callbacks.current.onReady();
      },
      onVideoSizeChanged: (_connection, source, _uid, width, height) => {
        if (source === VideoSourceType.VideoSourceScreenPrimary && sharing.current) { layout.current = gameStreamLayout(width, height); instance.updateLocalTranscoderConfiguration(mixConfiguration()); }
      },
      onLocalVideoStateChanged: (source, state) => {
        if (source === VideoSourceType.VideoSourceScreenPrimary && (state === 0 || state === 3) && (sharing.current || screenWaiter.current)) stopCapture.current();
      },
      onPermissionError: () => { if (screenWaiter.current) stopCapture.current(); },
      onLocalVideoTranscoderError: () => { if (screenWaiter.current || sharing.current) { stopCapture.current(); callbacks.current.onScreenShareError?.(); } },
      onFirstLocalVideoFramePublished: () => { if (__DEV__) console.info("[Live][Host][Agora] first local frame published"); publishWaiter.current?.resolve(); },
      onJoinChannelSuccess: (connection) => { joined.current = true; if (__DEV__) console.info("[Live][Host][Agora] joined", { uid: connection.localUid, channel: connection.channelId }); },
      onVideoPublishStateChanged: (_source, _channel, _oldState, newState) => {
        if (newState === StreamPublishState.PubStatePublished) publishWaiter.current?.resolve();
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
  }, [props.appId]);

  useEffect(() => {
    if (!engine.current || lastFacing.current === props.facing) return;
    lastFacing.current = props.facing;
    engine.current.switchCamera();
  }, [props.facing]);
  useEffect(() => { if (sharing.current) engine.current?.updateLocalTranscoderConfiguration(mixConfiguration()); else engine.current?.enableLocalVideo(props.cameraOn); }, [props.cameraOn]);
  useEffect(() => { engine.current?.enableLocalAudio(props.microphoneOn); }, [props.microphoneOn]);

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

  return <View style={props.style}><RtcSurfaceView canvas={{ uid: 0, sourceType: screenSharing ? VideoSourceType.VideoSourceTranscoded : VideoSourceType.VideoSourceCameraPrimary, mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled, renderMode: screenSharing ? RenderModeType.RenderModeFit : RenderModeType.RenderModeHidden }} style={{ flex: 1 }} /></View>;
});
