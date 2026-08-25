import { Platform } from "react-native";

type VoiceCallModule = typeof import("./voice-call-screen.native");

const platformModule = (Platform.OS === "web"
  ? require("./voice-call-screen.web")
  : require("./voice-call-screen.native")) as VoiceCallModule;

export const VoiceCallScreen = platformModule.VoiceCallScreen;
