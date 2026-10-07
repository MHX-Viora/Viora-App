import type { IAgoraRTCClient, IAgoraRTCRemoteUser, IRemoteVideoTrack, IRemoteAudioTrack } from "agora-rtc-sdk-ng";
import type { LivePlaybackState } from "./audience-agora-view";

type MediaType = "video" | "audio";
type Subscription = { user: IAgoraRTCRemoteUser; type: MediaType; track?: IRemoteVideoTrack | IRemoteAudioTrack; cleanup?: () => void; };

// The event path and the join/reconnect snapshot use the same pending map.
// A removed entry also invalidates subscribe promises that complete after unpublish.
export function createAudiencePlayback(client: IAgoraRTCClient, callbacks: {
  onState: (state: LivePlaybackState) => void;
  onError: (error: unknown) => void;
  log?: (event: string, details?: Record<string, unknown>) => void;
}) {
  let disposed = false;
  let container: HTMLElement | null = null;
  let state: LivePlaybackState = "connecting";
  const subscriptions = new Map<string, Subscription>();
  const key = (uid: string | number, type: MediaType) => `${uid}:${type}`;
  const report = (next: LivePlaybackState) => { if (!disposed) { state = next; callbacks.onState(next); } };
  const fail = (error: unknown) => { if (!disposed) { report("error"); callbacks.onError(error); } };

  const play = (entry: Subscription) => {
    if (disposed || !entry.track) return;
    if (entry.type === "audio") { (entry.track as IRemoteAudioTrack).play(); return; }
    if (!container) return;
    entry.cleanup?.();
    const track = entry.track as IRemoteVideoTrack;
    const active = () => !disposed && subscriptions.get(key(entry.user.uid, "video")) === entry;
    const decoded = () => { if (active()) report("playing"); };
    const videoState = (value: number) => { if (active()) { if (value === 2) decoded(); else if (value === 3) report("reconnecting"); } };
    track.on("first-frame-decoded", decoded);
    track.on("video-state-changed", videoState);
    entry.cleanup = () => { track.off("first-frame-decoded", decoded); track.off("video-state-changed", videoState); };
    try {
      track.play(container, { fit: "cover", mirror: false });
      // A resumed player may already have decoded frames before this listener.
      const video = container.querySelector?.("video");
      if (video && video.readyState >= 2 && !video.paused) decoded();
      callbacks.log?.("video player attached", { uid: entry.user.uid });
    } catch (error) { fail(error); }
  };

  const subscribe = async (user: IAgoraRTCRemoteUser, type: MediaType) => {
    const id = key(user.uid, type);
    if (disposed) return;
    const existing = subscriptions.get(id);
    const currentTrack = type === "video" ? user.videoTrack : user.audioTrack;
    if (existing) {
      // The SDK can replace remote track objects while restoring media.
      // Keep pending work deduplicated, but never replay an obsolete track.
      if (!existing.track || !currentTrack || existing.track === currentTrack) return;
      existing.cleanup?.();
      existing.track.stop();
      subscriptions.delete(id);
    }
    const entry: Subscription = { user, type };
    subscriptions.set(id, entry);
    callbacks.log?.("subscribing", { uid: user.uid, mediaType: type });
    try {
      await client.subscribe(user, type);
      if (disposed || subscriptions.get(id) !== entry) return;
      entry.track = type === "video" ? user.videoTrack : user.audioTrack;
      if (!entry.track) throw new Error(`Agora subscription has no ${type} track`);
      callbacks.log?.("subscribed", { uid: user.uid, mediaType: type });
      play(entry);
    } catch (error) {
      if (disposed || subscriptions.get(id) !== entry) return;
      subscriptions.delete(id);
      callbacks.log?.("subscribe failed", { uid: user.uid, mediaType: type });
      fail(error);
    }
  };
  const remove = (user: IAgoraRTCRemoteUser, type: MediaType) => {
    const id = key(user.uid, type);
    const entry = subscriptions.get(id);
    subscriptions.delete(id);
    entry?.cleanup?.();
    entry?.track?.stop();
    if (type === "video" && !disposed) report("waitingForHost");
  };
  const reconcile = () => {
    if (disposed) return;
    for (const user of client.remoteUsers) {
      if (user.hasVideo) void subscribe(user, "video");
      if (user.hasAudio) void subscribe(user, "audio");
    }
  };
  const published = (user: IAgoraRTCRemoteUser, type: "video" | "audio" | "datachannel") => {
    callbacks.log?.("user-published", { uid: user.uid, mediaType: type });
    if (type === "video" || type === "audio") void subscribe(user, type);
  };
  const unpublished = (user: IAgoraRTCRemoteUser, type: "video" | "audio" | "datachannel") => {
    if (type === "video" || type === "audio") remove(user, type);
  };
  const left = (user: IAgoraRTCRemoteUser) => { remove(user, "video"); remove(user, "audio"); };
  const joinedUser = (user: IAgoraRTCRemoteUser) => callbacks.log?.("user-joined", { uid: user.uid });
  const connected = (next: string, previous: string) => {
    callbacks.log?.("connection-state-change", { state: next, previous });
    if (next === "RECONNECTING") report("reconnecting");
    else if (next === "CONNECTED" && previous === "RECONNECTING") {
      report("waitingForHost");
      reconcile();
      for (const entry of subscriptions.values()) play(entry);
    } else if (next === "DISCONNECTED") fail(new Error("Agora audience disconnected"));
  };
  const mediaReconnectStart = () => report("reconnecting");
  const mediaReconnectEnd = () => { reconcile(); for (const entry of subscriptions.values()) play(entry); };
  client.on("user-published", published);
  client.on("user-unpublished", unpublished);
  client.on("user-joined", joinedUser);
  client.on("user-left", left);
  client.on("connection-state-change", connected);
  client.on("media-reconnect-start", mediaReconnectStart);
  client.on("media-reconnect-end", mediaReconnectEnd);
  report("connecting");

  return {
    joined() { if (state === "connecting") report("waitingForHost"); reconcile(); },
    setContainer(element: HTMLElement | null) { if (element === container) return; container = element; if (element) for (const entry of subscriptions.values()) play(entry); },
    dispose() {
      disposed = true;
      client.off("user-published", published);
      client.off("user-unpublished", unpublished);
      client.off("user-joined", joinedUser);
      client.off("user-left", left);
      client.off("connection-state-change", connected);
      client.off("media-reconnect-start", mediaReconnectStart);
      client.off("media-reconnect-end", mediaReconnectEnd);
      for (const entry of subscriptions.values()) { entry.cleanup?.(); entry.track?.stop(); }
      subscriptions.clear();
    },
  };
}
