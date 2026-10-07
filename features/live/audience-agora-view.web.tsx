import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import AgoraRTC from "agora-rtc-sdk-ng";
import type { IAgoraRTCClient } from "agora-rtc-sdk-ng";

import type { AudienceAgoraViewProps } from "./audience-agora-view";
import { createAudiencePlayback } from "./audience-agora-lifecycle";

export function AudienceAgoraView({ access, style, onTokenWillExpire, onError, onPlaybackStateChange }: AudienceAgoraViewProps) {
  const container = useRef<View>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const playbackRef = useRef<ReturnType<typeof createAudiencePlayback> | null>(null);
  const latestToken = useRef(access.token);
  latestToken.current = access.token;
  const callbacks = useRef({ onTokenWillExpire, onError, onPlaybackStateChange });
  callbacks.current = { onTokenWillExpire, onError, onPlaybackStateChange };
  const attachContainer = useCallback((element: View | null) => {
    container.current = element;
    playbackRef.current?.setContainer(element as unknown as HTMLElement | null);
  }, []);

  useEffect(() => {
    let disposed = false;
    const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    clientRef.current = client;
    const context = { appId: access.appId, channel: access.channelName, uid: access.uid, role: "audience", tokenRole: access.role };
    const log = (event: string, details?: Record<string, unknown>) => { if (__DEV__) console.info(`[Live][Viewer][Agora] ${event}`, { ...context, ...details }); };
    const fail = (error: unknown) => {
      if (disposed) return;
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "RTC_ERROR";
      console.error("[Live][Viewer][Agora] failed", { ...context, code });
      callbacks.current.onPlaybackStateChange?.("error");
      callbacks.current.onError();
    };
    const playback = createAudiencePlayback(client, {
      onState: (state) => callbacks.current.onPlaybackStateChange?.(state), onError: fail, log,
    });
    playbackRef.current = playback;
    playback.setContainer(container.current as unknown as HTMLElement | null);
    const tokenExpired = () => { if (!disposed) callbacks.current.onTokenWillExpire(); };
    client.on("token-privilege-will-expire", tokenExpired);
    client.on("token-privilege-did-expire", tokenExpired);
    void (async () => {
      try {
        await client.setClientRole("audience");
        if (disposed) return;
        log("joining");
        await client.join(access.appId, access.channelName, access.token, access.uid);
        if (disposed) { await client.leave(); return; }
        log("joined", { uid: client.uid, remoteUsers: client.remoteUsers.map((user) => ({ uid: user.uid, hasVideo: user.hasVideo, hasAudio: user.hasAudio })) });
        if (latestToken.current !== access.token) await client.renewToken(latestToken.current);
        playback.joined();
      } catch (error) { fail(error); }
    })();
    return () => {
      disposed = true;
      playback.dispose();
      if (playbackRef.current === playback) playbackRef.current = null;
      client.off("token-privilege-will-expire", tokenExpired);
      client.off("token-privilege-did-expire", tokenExpired);
      if (clientRef.current === client) clientRef.current = null;
      void client.leave().catch(() => { if (__DEV__) console.warn("[Live][Viewer][Agora] leave failed", context); });
    };
    // Token rotation renews the current client instead of tearing down its player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.appId, access.channelName, access.uid]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client || (client.connectionState !== "CONNECTED" && client.connectionState !== "RECONNECTING")) return;
    let active = true;
    void client.renewToken(access.token).catch(() => {
      if (!active) return;
      console.error("[Live][Viewer][Agora] token renewal failed");
      callbacks.current.onPlaybackStateChange?.("error");
      callbacks.current.onError();
    });
    return () => { active = false; };
  }, [access.token]);

  return <View ref={attachContainer} style={style} />;
}
