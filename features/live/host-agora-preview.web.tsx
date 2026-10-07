import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
import AgoraRTC, { type IAgoraRTCClient, type ICameraVideoTrack, type IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

import type { HostAgoraPreviewHandle, HostAgoraPreviewProps } from "./host-agora-preview";

export const HostAgoraPreview = forwardRef<HostAgoraPreviewHandle, HostAgoraPreviewProps>(function HostAgoraPreview(props, ref) {
  const container = useRef<View>(null);
  const client = useRef<IAgoraRTCClient | null>(null);
  const video = useRef<ICameraVideoTrack | null>(null);
  const audio = useRef<IMicrophoneAudioTrack | null>(null);
  const callbacks = useRef(props);
  callbacks.current = props;

  useEffect(() => {
    if (!props.appId) return;
    let disposed = false;
    const rtc = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    client.current = rtc;

    rtc.on("token-privilege-will-expire", () => callbacks.current.onTokenWillExpire());
    rtc.on("token-privilege-did-expire", () => callbacks.current.onTokenWillExpire());
    void (async () => {
      try {
        const camera = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 60, min: 30 },
            bitrateMin: 1500,
            bitrateMax: 5000,
          },
          optimizationMode: "balanced",
        });
        if (disposed) { camera.close(); return; }
        video.current = camera;
        const microphone = await AgoraRTC.createMicrophoneAudioTrack();
        if (disposed) { camera.close(); microphone.close(); return; }
        audio.current = microphone;
        const element = container.current as unknown as HTMLElement | null;
        if (!element) throw new Error("Không tìm thấy vùng xem trước camera.");
        camera.play(element, { fit: "cover", mirror: false });
        callbacks.current.onReady();
      } catch (error) { if (!disposed) { console.error("[Live host] camera/microphone failed", error); callbacks.current.onError(); } }
    })();
    return () => {
      disposed = true;
      rtc.removeAllListeners();
      void rtc.leave().catch((error) => console.error("[Live host] leave failed", error));
      video.current?.close();
      audio.current?.close();
      video.current = null;
      audio.current = null;
      client.current = null;
    };
  }, [props.appId]);

  useEffect(() => { void video.current?.setMuted(!props.cameraOn).catch((error) => console.error("[Live host] camera toggle failed", error)); }, [props.cameraOn]);
  useEffect(() => { void audio.current?.setMuted(!props.microphoneOn).catch((error) => console.error("[Live host] microphone toggle failed", error)); }, [props.microphoneOn]);
  useEffect(() => {
    if (!video.current) return;
    void AgoraRTC.getCameras().then((devices) => {
      if (devices.length < 2 || !video.current) return;
      const current = video.current.getMediaStreamTrack().getSettings().deviceId;
      const next = devices.find((device) => device.deviceId !== current);
      if (next) return video.current.setDevice(next.deviceId);
    }).catch(() => callbacks.current.onError());
  }, [props.facing]);

  useImperativeHandle(ref, () => ({
    async join(access) {
      if (!client.current || !video.current || !audio.current) throw new Error("Camera hoặc micro chưa sẵn sàng.");
      const rtc = client.current;
      if (access.role !== "broadcaster" || access.appId !== callbacks.current.appId) throw new Error("Thông tin kênh phát Live không hợp lệ.");
      const context = { appId: access.appId, channel: access.channelName, uid: access.uid, role: access.role };
      try {
        await rtc.setClientRole("host");
        if (__DEV__) console.info("[Live host] joining", context);
        const uid = await rtc.join(access.appId, access.channelName, access.token, access.uid);
        if (__DEV__) console.info("[Live host] joined", { ...context, uid });
        await video.current.setMuted(!callbacks.current.cameraOn);
        await audio.current.setMuted(!callbacks.current.microphoneOn);
        if (__DEV__) console.info("[Live host] publishing video/audio", context);
        await rtc.publish([video.current, audio.current]);
        if (__DEV__) console.info("[Live host] published video/audio", context);
      } catch (error) {
        console.error("[Live host] join/publish failed", context, { code: error && typeof error === "object" && "code" in error ? String(error.code) : "RTC_ERROR" });
        throw error;
      }
    },
    async renew(token) {
      if (!client.current) throw new Error("Agora chưa sẵn sàng.");
      await client.current.renewToken(token);
    },
    async leave() { await client.current?.leave(); },
  }), []);

  return <View ref={container} style={props.style} />;
});
