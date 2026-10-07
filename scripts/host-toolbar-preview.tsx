// Isolated presentation regression; no Agora publishing or real gift payments.
import Ionicons from "@expo/vector-icons/Ionicons";
import { registerRootComponent } from "expo";
import * as Font from "expo-font";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../theme";
import { LiveHostRoom } from "../features/live/live-host-room";
import { LiveHostSetup } from "../features/live/live-host-setup";
import { initialHostSettings } from "../features/live/live-host-model";
import { useLiveGiftOverlay } from "../features/live/live-gift-overlay";
import type { HostAgoraPreviewHandle } from "../features/live/host-agora-preview";
import type { LiveHeartBurstHandle } from "../features/live/live-heart-burst";

function Preview() {
  const [mode, setMode] = useState<"setup" | "check" | "countdown" | "live">("live");
  const [cameraOn, setCameraOn] = useState(true);
  const [microphoneOn, setMicrophoneOn] = useState(true);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [actions, setActions] = useState(0);
  const [settings, setSettings] = useState({ ...initialHostSettings, title: "Kiểm tra thanh công cụ" });
  const agoraRef = useRef<HostAgoraPreviewHandle>(null);
  const heartBurstRef = useRef<LiveHeartBurstHandle>(null);
  const { giftQueue, showGiftEvent } = useLiveGiftOverlay();
  const noop = () => {};
  const resolved = async () => {};
  const action = () => setActions(value => value + 1);
  return <View style={styles.root}>
    <View style={styles.room}>
      {mode === "setup" ? <LiveHostSetup settings={settings} onChange={setSettings} onContinue={() => setMode("check")} onBack={noop} activeLive={null} checkingActive={false} endingActive={false} onEndActive={noop} /> : <LiveHostRoom
        mode={mode} settings={settings} comments={[]} pinnedComment={null} hostUserId="host"
        onCommentsChange={noop} onPinComment={resolved} giftQueue={giftQueue} topGifters={[]}
        elapsed={90} countdown={3} demoMode viewerCount={1} reactionCount={1} heartBurstRef={heartBurstRef}
        onReportComment={resolved} onMuteUser={resolved} onDeleteComment={resolved} onSendComment={resolved}
        cameraGranted cameraReady cameraError={false} cameraSession={0} agoraAppId="" agoraRef={agoraRef}
        onTokenWillExpire={noop} microphoneGranted cameraOn={cameraOn} microphoneOn={microphoneOn} facing={facing} connected
        onRequestPermissions={noop} onCameraToggle={() => setCameraOn(value => !value)} onMicrophoneToggle={() => setMicrophoneOn(value => !value)}
        onFlipCamera={() => { setFacing(value => value === "front" ? "back" : "front"); action(); }}
        onCameraReady={noop} onCameraError={noop} onBack={() => setMode("setup")} onStart={() => setMode("live")}
        onCancelCountdown={() => setMode("check")} onDemo={() => setMode("live")} onCloseDemo={() => setMode("check")}
        onEndRequest={() => setMode("check")}
      />}
    </View>
    <View style={styles.debug}>
      <Text style={styles.text}>Demo UI · {facing} · thao tác {actions}</Text>
      <View style={styles.buttons}>
        {(["setup", "check", "countdown", "live"] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Preview ${value}`} onPress={() => setMode(value)} style={styles.button}><Text style={styles.text}>{value}</Text></Pressable>)}
        <Pressable accessibilityRole="button" accessibilityLabel="Preview gift" style={styles.button} onPress={() => showGiftEvent({ id: String(Date.now()), liveId: "preview", senderUserId: "viewer", senderName: "VIEWER", giftId: "rose", giftName: "Hoa hồng", quantity: 1, totalAmount: 1000, imageUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text y="48" font-size="44">🌹</text></svg>') })}><Text style={styles.text}>gift</Text></Pressable>
      </View>
    </View>
  </View>;
}
function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => { void Font.loadAsync(Ionicons.font).then(() => setReady(true)); }, []);
  return ready ? <SafeAreaProvider><ThemeProvider><Preview /></ThemeProvider></SafeAreaProvider> : null;
}
registerRootComponent(App);
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#091725" }, room: { flex: 1 }, debug: { backgroundColor: "#102235", padding: 8, gap: 4 }, text: { color: "#FFFFFF", fontSize: 11 }, buttons: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, button: { padding: 8, backgroundColor: "#28425B", borderRadius: 6 } });
