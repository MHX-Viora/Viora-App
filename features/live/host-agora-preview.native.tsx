import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
import {
  ChannelProfileType, ClientRoleType, DegradationPreference, OrientationMode, RenderModeType,
  RtcSurfaceView, StreamPublishState, VideoMirrorModeType,
  createAgoraRtcEngine, type IRtcEngine, type IRtcEngineEventHandler,
} from "react-native-agora";

import type { HostAgoraPreviewHandle, HostAgoraPreviewProps } from "./host-agora-preview";

export const HostAgoraPreview = forwardRef<HostAgoraPreviewHandle, HostAgoraPreviewProps>(function HostAgoraPreview(props, ref) {
  const engine = useRef<IRtcEngine | null>(null);
  const callbacks = useRef(props);
  const publishWaiter = useRef<{ resolve: () => void; reject: (reason: Error) => void } | null>(null);
  const lastFacing = useRef(props.facing);
  callbacks.current = props;

  useEffect(() => {
    if (!props.appId) return;
    const instance = createAgoraRtcEngine();
    const handler: IRtcEngineEventHandler = {
      onFirstLocalVideoFrame: () => callbacks.current.onReady(),
      onFirstLocalVideoFramePublished: () => { if (__DEV__) console.info("[Live][Host][Agora] first local frame published"); publishWaiter.current?.resolve(); },
      onJoinChannelSuccess: (connection) => { if (__DEV__) console.info("[Live][Host][Agora] joined", { uid: connection.localUid, channel: connection.channelId }); },
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
  useEffect(() => { engine.current?.enableLocalVideo(props.cameraOn); }, [props.cameraOn]);
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
          publishCameraTrack: true, publishMicrophoneTrack: true,
        });
        if (code !== 0) publishWaiter.current?.reject(new Error("Không thể vào kênh Agora."));
      });
    },
    async renew(token) {
      const code = engine.current?.renewToken(token);
      if (code !== 0) throw new Error("Không thể gia hạn kết nối Live.");
    },
    async leave() { engine.current?.leaveChannel(); },
  }), []);

  return <View style={props.style}><RtcSurfaceView canvas={{ uid: 0, mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled, renderMode: RenderModeType.RenderModeHidden }} style={{ flex: 1 }} /></View>;
});
