import type { IceServer } from "@/types/call";

type BrowserPeer = {
  addIceCandidate: (candidate: unknown) => Promise<void>;
  close: () => void;
  createAnswer: (offer: unknown) => Promise<RTCSessionDescriptionInit>;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  localStream: MediaStream;
  remoteStream: MediaStream;
  setAnswer: (answer: unknown) => Promise<void>;
  setCameraEnabled: (enabled: boolean) => void;
  setMicrophoneEnabled: (enabled: boolean) => void;
};

const asDescription = (value: unknown) => value as RTCSessionDescriptionInit;
const asCandidate = (value: unknown) => value as RTCIceCandidateInit;

export const createVoicePeer = async (
  iceServers: IceServer[],
  onIceCandidate: (candidate: unknown) => void,
  onConnectionStateChange?: (state: string) => void,
  options?: {
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    video?: boolean;
  },
): Promise<BrowserPeer> => {
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    throw new Error("Trình duyệt này không hỗ trợ gọi điện WebRTC.");
  }

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: options?.video ? { facingMode: "user" } : false,
  });
  const remoteStream = new MediaStream();
  const peer = new RTCPeerConnection({ iceServers });
  let closed = false;

  localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
  peer.onicecandidate = ({ candidate }) => {
    if (candidate) onIceCandidate(candidate.toJSON());
  };
  peer.onconnectionstatechange = () => onConnectionStateChange?.(peer.connectionState);
  peer.oniceconnectionstatechange = () => onConnectionStateChange?.(peer.iceConnectionState);
  peer.ontrack = ({ streams, track }) => {
    const stream = streams[0] ?? remoteStream;
    if (!streams[0] && !remoteStream.getTracks().some((item) => item.id === track.id)) {
      remoteStream.addTrack(track);
    }
    options?.onRemoteStream?.(stream);
  };
  options?.onLocalStream?.(localStream);

  const tracks = (kind: "audio" | "video") =>
    localStream.getTracks().filter((track) => track.kind === kind);

  return {
    addIceCandidate: (candidate) => peer.addIceCandidate(asCandidate(candidate)),
    close: () => {
      if (closed) return;
      closed = true;
      localStream.getTracks().forEach((track) => track.stop());
      peer.close();
    },
    createAnswer: async (offer) => {
      await peer.setRemoteDescription(asDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return answer;
    },
    createOffer: async () => {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      return offer;
    },
    localStream,
    remoteStream,
    setAnswer: (answer) => peer.setRemoteDescription(asDescription(answer)),
    setCameraEnabled: (enabled) => tracks("video").forEach((track) => { track.enabled = enabled; }),
    setMicrophoneEnabled: (enabled) => tracks("audio").forEach((track) => { track.enabled = enabled; }),
  };
};
