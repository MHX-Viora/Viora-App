import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import AgoraRTC, { type IAgoraRTCClient, type ICameraVideoTrack, type IMicrophoneAudioTrack, type ILocalVideoTrack } from "agora-rtc-sdk-ng";

import type { HostAgoraPreviewHandle, HostAgoraPreviewProps } from "./host-agora-preview";
import { getHostVideoFrame } from './host-video-frame';
import { createGameStream } from './game-stream-compositor';

type GameShare = { screen: ILocalVideoTrack; video: ILocalVideoTrack; composition: Awaited<ReturnType<typeof createGameStream>>; ended: () => void };
const disposeShare = (share: GameShare) => { share.screen.off('track-ended', share.ended); share.video.stop(); share.video.close(); share.composition.stop(); share.screen.close(); };

export const HostAgoraPreview = forwardRef<HostAgoraPreviewHandle, HostAgoraPreviewProps>(function HostAgoraPreview(props, ref) {
  const container = useRef<View>(null);
  const client = useRef<IAgoraRTCClient | null>(null);
  const video = useRef<ICameraVideoTrack | null>(null);
  const audio = useRef<IMicrophoneAudioTrack | null>(null);
  const callbacks = useRef(props);
  const sharing = useRef<GameShare | null>(null);
  const shareBusy = useRef(false);
  const alive = useRef(false);
  const published = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [videoSize, setVideoSize] = useState({ width: 16, height: 9 });
  const frame = getHostVideoFrame(stageSize, videoSize);
  callbacks.current = props;

  useEffect(() => {
    if (!props.appId) return;
    alive.current = true;
    let disposed = false;
    let observer: MutationObserver | undefined;
    let detachVideo = () => {};
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
        const settings = camera.getMediaStreamTrack().getSettings();
        if (settings.width && settings.height) setVideoSize({ width: settings.width, height: settings.height });
        camera.play(element, { fit: "contain", mirror: false });
        let currentPlayer: HTMLVideoElement | null = null;
        const attachVideo = () => {
          const player = element.querySelector('video');
          if (!player || player === currentPlayer) return;
          detachVideo();
          currentPlayer = player;
          const updateSize = () => {
            if (!disposed && player.videoWidth > 0 && player.videoHeight > 0) setVideoSize({ width: player.videoWidth, height: player.videoHeight });
          };
          player.addEventListener('loadedmetadata', updateSize);
          player.addEventListener('resize', updateSize);
          updateSize();
          detachVideo = () => { player.removeEventListener('loadedmetadata', updateSize); player.removeEventListener('resize', updateSize); };
        };
        observer = new MutationObserver(attachVideo);
        observer.observe(element, { childList: true, subtree: true });
        attachVideo();
        callbacks.current.onReady();
      } catch (error) { if (!disposed) { console.error("[Live host] camera/microphone failed", error); callbacks.current.onError(); } }
    })();
    return () => {
      disposed = true;
      alive.current = false;
      published.current = false;
      if (sharing.current) { disposeShare(sharing.current); sharing.current = null; callbacks.current.onScreenShareChanged?.(false); }
      observer?.disconnect();
      detachVideo();
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

  const stopScreenShare = useCallback(async () => {
    const share = sharing.current, camera = video.current, rtc = client.current;
    if (!share || !camera || shareBusy.current) return;
    shareBusy.current = true;
    try {
      if (published.current && rtc) { await rtc.unpublish(share.video); await rtc.publish(camera); }
      share.video.stop(); camera.play(container.current as unknown as HTMLElement, { fit: 'contain', mirror: false });
      const settings = camera.getMediaStreamTrack().getSettings();
      if (settings.width && settings.height) setVideoSize({ width: settings.width, height: settings.height });
    } finally {
      disposeShare(share); sharing.current = null; shareBusy.current = false;
      if (alive.current) callbacks.current.onScreenShareChanged?.(false);
    }
  }, []);

  const shareScreen = useCallback(async () => {
    const camera = video.current, rtc = client.current;
    if (!camera || !rtc) throw new Error('Camera chưa sẵn sàng.');
    if (sharing.current || shareBusy.current) return;
    shareBusy.current = true;
    let screen: ILocalVideoTrack | undefined, composition: Awaited<ReturnType<typeof createGameStream>> | undefined, composed: ILocalVideoTrack | undefined;
    let switched = false;
    try {
      // Called from the share button so the browser retains the capture user gesture.
      screen = await AgoraRTC.createScreenVideoTrack({ encoderConfig: '1080p_2', optimizationMode: 'motion' }, 'disable');
      if (!alive.current || client.current !== rtc) throw new Error('Đã đóng màn hình live.');
      composition = await createGameStream(screen.getMediaStreamTrack(), camera.getMediaStreamTrack(), () => callbacks.current.cameraOn);
      if (!alive.current || client.current !== rtc) throw new Error('Đã đóng màn hình live.');
      composed = AgoraRTC.createCustomVideoTrack({ mediaStreamTrack: composition.track, width: composition.layout.width, height: composition.layout.height, frameRate: 30 });
      if (published.current) {
        await rtc.unpublish(camera);
        try { await rtc.publish(composed); } catch (error) { await rtc.publish(camera); throw error; }
        switched = true;
      }
      if (!alive.current || client.current !== rtc) throw new Error('Đã đóng màn hình live.');
      camera.stop(); composed.play(container.current as unknown as HTMLElement, { fit: 'contain', mirror: false });
      const ended = () => { void stopScreenShare().catch(() => callbacks.current.onScreenShareError?.()); };
      sharing.current = { screen, video: composed, composition, ended }; screen.on('track-ended', ended);
      setVideoSize({ width: composition.layout.width, height: composition.layout.height });
      callbacks.current.onScreenShareChanged?.(true);
    } catch (error) {
      if (switched && composed && alive.current && client.current === rtc) {
        await rtc.unpublish(composed).catch(() => {});
        await rtc.publish(camera).catch(() => callbacks.current.onError());
      }
      composed?.close(); composition?.stop(); screen?.close();
      if (alive.current && client.current === rtc) camera.play(container.current as unknown as HTMLElement, { fit: 'contain', mirror: false });
      throw error;
    }
    finally { shareBusy.current = false; }
  }, [stopScreenShare]);

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
        await rtc.publish([sharing.current?.video ?? video.current, audio.current]);
        published.current = true;
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
    async leave() { published.current = false; if (sharing.current) await stopScreenShare(); await client.current?.leave(); },
    shareScreen,
    stopScreenShare,
  }), [shareScreen, stopScreenShare]);

  return <View style={props.style} onLayout={event => setStageSize(event.nativeEvent.layout)}>
    <View ref={container} style={frame ? { position: 'absolute', ...frame } : StyleSheet.absoluteFillObject} />
  </View>;
});
