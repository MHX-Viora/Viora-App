import { Asset } from "expo-asset";

let player: HTMLAudioElement | null = null;
const played = new Map<string, number>();
const DEDUPE_MS = 30_000;

export const playNotificationSound = async (eventId?: string): Promise<void> => {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  const now = Date.now();
  for (const [id, time] of played) if (now - time >= DEDUPE_MS) played.delete(id);
  if (eventId && played.has(eventId)) return;
  if (eventId) played.set(eventId, now);
  if (played.size > 256) played.delete(played.keys().next().value!);
  try {
    player ??= new Audio(Asset.fromModule(require("../assets/audio/ankt_notification.wav")).uri);
    player.volume = 0.7;
    player.currentTime = 0;
    await player.play();
  } catch {
    // Browsers may require a user gesture or mute the tab; keep the visible alert.
  }
};
