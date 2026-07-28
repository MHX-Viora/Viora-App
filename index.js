import { registerGlobals, setLogLevel } from "@livekit/react-native";
import { Event as WebRTCEvent } from "@livekit/react-native-webrtc";
import { LogBox } from "react-native";

if (typeof globalThis.Event === "undefined") {
  globalThis.Event = WebRTCEvent;
}
registerGlobals();
setLogLevel("silent", { liveKitClientLogLevel: "silent" });
LogBox.ignoreLogs([
  "An event listener wasn't added because it has been added already",
]);

import "./services/incoming-call-notifee-events";
import "./services/firebase-background-messaging";
import "expo-router/entry";
