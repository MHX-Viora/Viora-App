import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Platform, Vibration } from "react-native";

import { INCOMING_CALL_VIBRATION_PATTERN } from "@/features/calls/call-waiting";

let player: AudioPlayer | null = null;
let startSequence = 0;
let isRinging = false;

const getPlayer = () => {
  player ??= createAudioPlayer(require("../assets/audio/nhac_chuong.mp3"));
  return player;
};

export const startIncomingCallRingtone = async () => {
  // The same invitation can arrive through SignalR, FCM and the mounted host.
  // Restarting audio focus for every copy can cancel the play request on Android.
  if (isRinging) return;
  isRinging = true;
  const sequence = ++startSequence;
  const next = getPlayer();
  if (Platform.OS !== "web") {
    Vibration.vibrate([0, ...INCOMING_CALL_VIBRATION_PATTERN], true);
  }
  next.loop = true;
  next.volume = 1;

  await setAudioModeAsync({
    allowsRecording: false,
    interruptionMode: "doNotMix",
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    shouldRouteThroughEarpiece: false,
  }).catch((error: unknown) => {
    console.info(
      "[Call][Audio] audio focus unavailable; using current mode",
      error instanceof Error ? error.message : String(error),
    );
  });

  if (sequence !== startSequence) return;
  try {
    next.play();
  } catch (error) {
    isRinging = false;
    if (Platform.OS !== "web") Vibration.cancel();
    throw error;
  }
};

export const stopIncomingCallRingtone = () => {
  startSequence += 1;
  isRinging = false;
  if (Platform.OS !== "web") Vibration.cancel();
  if (!player) return;
  try {
    player.pause();
    void player.seekTo(0).catch(() => undefined);
  } catch {
    // Native audio may already be released while the app is shutting down.
  }
};
