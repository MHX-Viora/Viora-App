import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Platform, Vibration } from "react-native";

let player: AudioPlayer | null = null;
let startSequence = 0;

const getPlayer = () => {
  player ??= createAudioPlayer(require("../assets/audio/nhac_chuong.mp3"));
  return player;
};

export const startIncomingCallRingtone = async () => {
  const sequence = ++startSequence;
  const next = getPlayer();
  if (Platform.OS !== "web") {
    Vibration.vibrate([0, 500, 250, 500, 250, 900, 250], true);
  }
  next.loop = true;
  next.volume = 1;

  await setAudioModeAsync({
    allowsRecording: false,
    interruptionMode: "doNotMix",
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  }).catch((error: unknown) => {
    console.info(
      "[Call][Audio] audio focus unavailable; using current mode",
      error instanceof Error ? error.message : String(error),
    );
  });

  if (sequence === startSequence) next.play();
};

export const stopIncomingCallRingtone = () => {
  startSequence += 1;
  if (Platform.OS !== "web") Vibration.cancel();
  if (!player) return;
  try {
    player.pause();
    void player.seekTo(0).catch(() => undefined);
  } catch {
    // Native audio may already be released while the app is shutting down.
  }
};
