import type { IceServer } from "@/types/call";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { Camera } from "expo-camera";

type MediaTrackLike = {
  enabled: boolean;
  kind?: string;
  release?: () => void;
  stop: () => void;
};

type MediaStreamLike = {
  addTrack?: (track: MediaTrackLike) => void;
  getAudioTracks?: () => MediaTrackLike[];
  getTracks: () => MediaTrackLike[];
  getVideoTracks?: () => MediaTrackLike[];
  release?: (releaseTracks?: boolean) => void;
  removeTrack?: (track: MediaTrackLike) => void;
  toURL?: () => string;
};

type RtpSenderLike = {
  replaceTrack: (track: MediaTrackLike | null) => Promise<void>;
};

type PeerStateSnapshot = {
  connectionState: string;
  iceConnectionState: string;
  iceGatheringState: string;
  signalingState: string;
};

export const getEffectivePeerState = (state: PeerStateSnapshot) => {
  if (state.connectionState === "connected") return "connected";
  if (
    state.iceConnectionState === "connected" ||
    state.iceConnectionState === "completed"
  ) {
    return state.iceConnectionState;
  }
  if (state.connectionState === "failed" || state.iceConnectionState === "failed") {
    return "failed";
  }
  if (
    state.connectionState === "disconnected" ||
    state.iceConnectionState === "disconnected"
  ) {
    return "disconnected";
  }
  return state.connectionState !== "unknown"
    ? state.connectionState
    : state.iceConnectionState;
};

type PeerEvent = {
  candidate?: unknown;
  stream?: MediaStreamLike;
  streams?: MediaStreamLike[];
  track?: MediaTrackLike;
};

type WebRtcModule = {
  MediaStream?: new (tracks: MediaTrackLike[]) => MediaStreamLike;
  RTCPeerConnection: new (configuration: { iceServers: IceServer[] }) => {
    addEventListener?: (event: string, handler: (event: PeerEvent) => void) => void;
    addIceCandidate: (candidate: unknown) => Promise<void>;
    addStream?: (stream: MediaStreamLike) => void;
    addTrack?: (
      track: MediaTrackLike,
      stream: MediaStreamLike,
    ) => RtpSenderLike;
    close: () => void;
    connectionState?: string;
    createAnswer: () => Promise<unknown>;
    createOffer: () => Promise<unknown>;
    iceConnectionState?: string;
    iceGatheringState?: string;
    setLocalDescription: (description: unknown) => Promise<void>;
    setRemoteDescription: (description: unknown) => Promise<void>;
    signalingState?: string;
  };
  mediaDevices: {
    getUserMedia: (constraints: {
      audio: boolean;
      video: boolean | Record<string, unknown>;
    }) => Promise<MediaStreamLike>;
  };
};

const normalizeWebRtcModule = (value: unknown): WebRtcModule => {
  const moduleValue =
    typeof value === "object" &&
    value !== null &&
    "default" in value &&
    typeof (value as { default?: unknown }).default === "object" &&
    (value as { default?: unknown }).default !== null
      ? (value as { default: unknown }).default
      : value;

  const candidate = moduleValue as Partial<WebRtcModule>;
  if (!candidate.RTCPeerConnection || !candidate.mediaDevices?.getUserMedia) {
    throw new Error(
      "WebRTC native API chưa sẵn sàng. Hãy build lại ứng dụng và cấp quyền micro.",
    );
  }

  return candidate as WebRtcModule;
};

const loadWebRtc = async (): Promise<WebRtcModule> => {
  try {
    return normalizeWebRtcModule(require("@livekit/react-native-webrtc"));
  } catch (error) {
    throw new Error(
      "WebRTC chưa được tích hợp vào bản cài đặt. Hãy chạy lại npm run android để tạo native build mới.",
      { cause: error },
    );
  }
};

export const requestCallMediaPermissions = async (video: boolean) => {
  const microphonePermission = await requestRecordingPermissionsAsync();
  if (!microphonePermission.granted) {
    throw new Error("Bạn cần cấp quyền micro để nghe gọi.");
  }

  if (video) {
    const cameraPermission = await Camera.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      throw new Error("Bạn cần cấp quyền camera để gọi video.");
    }
  }
};

export const createVoicePeer = async (
  iceServers: IceServer[],
  onIceCandidate: (candidate: unknown) => void,
  onConnectionStateChange?: (state: string) => void,
  options?: {
    onLocalStream?: (url: string) => void;
    onRemoteStream?: (url: string) => void;
    onStateChange?: (state: PeerStateSnapshot) => void;
    video?: boolean;
  },
) => {
  await requestCallMediaPermissions(Boolean(options?.video));

  const { MediaStream, RTCPeerConnection, mediaDevices } = await loadWebRtc();
  let stream = await mediaDevices.getUserMedia({
    audio: true,
    video: options?.video ? { facingMode: "user" } : false,
  });
  let localStreamUrl = stream.toURL?.() ?? "";
  let remoteStreamUrl = "";
  if (localStreamUrl) {
    console.info("[Call][Media] local stream ready", {
      audioTracks: stream.getAudioTracks?.().length ?? 0,
      videoTracks: stream.getVideoTracks?.().length ?? 0,
    });
    options?.onLocalStream?.(localStreamUrl);
  }

  const peer = new RTCPeerConnection({ iceServers });
  const snapshot = (): PeerStateSnapshot => ({
    connectionState: peer.connectionState ?? "unknown",
    iceConnectionState: peer.iceConnectionState ?? "unknown",
    iceGatheringState: peer.iceGatheringState ?? "unknown",
    signalingState: peer.signalingState ?? "unknown",
  });
  const reportState = (source: string) => {
    const state = snapshot();
    console.info(`[Call][WebRTC] ${source}`, state);
    options?.onStateChange?.(state);
    onConnectionStateChange?.(getEffectivePeerState(state));
  };

  let videoSender: RtpSenderLike | null = null;
  if (peer.addTrack) {
    stream.getTracks().forEach((track) => {
      const sender = peer.addTrack?.(track, stream);
      if (track.kind === "video" && sender) videoSender = sender;
    });
  } else {
    peer.addStream?.(stream);
  }

  peer.addEventListener?.("icecandidate", (event) => {
    if (event.candidate) {
      console.info("[Call][WebRTC] local ICE candidate");
      onIceCandidate(event.candidate);
    }
  });
  peer.addEventListener?.("connectionstatechange", () =>
    reportState("connection state changed"),
  );
  peer.addEventListener?.("iceconnectionstatechange", () =>
    reportState("ICE connection state changed"),
  );
  peer.addEventListener?.("icegatheringstatechange", () =>
    reportState("ICE gathering state changed"),
  );
  peer.addEventListener?.("signalingstatechange", () =>
    reportState("signaling state changed"),
  );

  const publishRemoteStream = (remoteStream?: MediaStreamLike | null) => {
    const remoteUrl = remoteStream?.toURL?.() ?? "";
    if (!remoteUrl) return;
    remoteStreamUrl = remoteUrl;
    console.info("[Call][Media] remote stream ready", {
      audioTracks: remoteStream?.getAudioTracks?.().length ?? 0,
      videoTracks: remoteStream?.getVideoTracks?.().length ?? 0,
    });
    options?.onRemoteStream?.(remoteUrl);
  };
  peer.addEventListener?.("track", (event) => {
    const fallbackStream =
      !event.streams?.[0] && event.track && MediaStream
        ? new MediaStream([event.track])
        : null;
    publishRemoteStream(event.streams?.[0] ?? event.stream ?? fallbackStream);
  });
  peer.addEventListener?.("addstream", (event) => {
    publishRemoteStream(event.stream ?? event.streams?.[0]);
  });

  const audioTracks = () =>
    stream.getAudioTracks?.() ??
    stream.getTracks().filter((track) => track.kind === "audio");
  const videoTracks = () =>
    stream.getVideoTracks?.() ??
    stream.getTracks().filter((track) => track.kind === "video");

  let isClosed = false;
  let isSwitchingCamera = false;
  let currentCameraFacingMode: "environment" | "user" = "user";

  const acquireCameraTrack = async (
    facingMode: "environment" | "user",
  ) => {
    const cameraStream = await mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode },
    });
    const [cameraTrack] =
      cameraStream.getVideoTracks?.() ??
      cameraStream.getTracks().filter((track) => track.kind === "video");
    if (!cameraTrack) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream.release?.();
      throw new Error("Không tìm thấy camera phù hợp trên thiết bị.");
    }
    cameraStream.release?.(false);
    return cameraTrack;
  };

  const attachCameraTrack = async (replacementTrack: MediaTrackLike) => {
    if (!videoSender || !MediaStream) {
      replacementTrack.stop();
      replacementTrack.release?.();
      throw new Error("Thiết bị không hỗ trợ đổi camera trong cuộc gọi.");
    }
    await videoSender.replaceTrack(replacementTrack);
    const previousStream = stream;
    stream = new MediaStream([...audioTracks(), replacementTrack]);
    previousStream.release?.(false);
    localStreamUrl = stream.toURL?.() ?? "";
    if (localStreamUrl) options?.onLocalStream?.(localStreamUrl);
  };

  return {
    addIceCandidate: async (candidate: unknown) => {
      await peer.addIceCandidate(candidate);
      console.info("[Call][WebRTC] remote ICE candidate added");
    },
    close: () => {
      if (isClosed) return;
      isClosed = true;
      stream.getTracks().forEach((track) => track.stop());
      peer.close();
      console.info("[Call][WebRTC] peer and local tracks closed");
    },
    createAnswer: async (offer: unknown) => {
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      console.info("[Call][Signal] answer created");
      return answer;
    },
    createOffer: async () => {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.info("[Call][Signal] offer created");
      return offer;
    },
    getLocalStreamUrl: () => localStreamUrl,
    getRemoteStreamUrl: () => remoteStreamUrl,
    setAnswer: async (answer: unknown) => {
      await peer.setRemoteDescription(answer);
      console.info("[Call][Signal] answer applied");
    },
    setCameraEnabled: (enabled: boolean) => {
      videoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    },
    setMicrophoneEnabled: (enabled: boolean) => {
      audioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    },
    switchCamera: async () => {
      if (isClosed || isSwitchingCamera) return;
      const [previousTrack] = videoTracks();
      if (!previousTrack) {
        throw new Error("Không tìm thấy camera đang hoạt động.");
      }

      isSwitchingCamera = true;
      const previousFacingMode = currentCameraFacingMode;
      const nextFacingMode =
        previousFacingMode === "user" ? "environment" : "user";
      const wasEnabled = previousTrack.enabled;
      try {
        stream.removeTrack?.(previousTrack);
        previousTrack.stop();
        previousTrack.release?.();
        const replacementTrack = await acquireCameraTrack(nextFacingMode);
        replacementTrack.enabled = wasEnabled;
        await attachCameraTrack(replacementTrack);
        currentCameraFacingMode = nextFacingMode;
      } catch (error) {
        try {
          const fallbackTrack = await acquireCameraTrack(previousFacingMode);
          fallbackTrack.enabled = wasEnabled;
          await attachCameraTrack(fallbackTrack);
        } catch (restoreError) {
          console.info(
            "[Call][Media] could not restore previous camera",
            restoreError instanceof Error
              ? restoreError.message
              : String(restoreError),
          );
        }
        throw error;
      } finally {
        isSwitchingCamera = false;
      }
    },
  };
};
