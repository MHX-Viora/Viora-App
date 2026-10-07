// Isolated cover acceptance harness; no authentication or Live publishing.
import { registerRootComponent } from "expo";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../theme";
import { LiveCoverImage } from "../features/live/live-cover-image";
import { LiveHostSetup } from "../features/live/live-host-setup";
import { initialHostSettings } from "../features/live/live-host-model";

const examples = [[800, 450], [450, 800], [800, 600], [600, 600], [1050, 450]];
function Preview() {
  const [source, setSource] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [settings, setSettings] = useState({ ...initialHostSettings, title: "Live Cover Acceptance" });
  const choose = (uri: string | null) => { setSource(uri); setSettings(value => ({ ...value, coverUri: uri })); };
  return <View style={styles.root}>
    <View style={styles.buttons}>
      <Pressable accessibilityRole="button" accessibilityLabel="Default" style={styles.button} onPress={() => choose(null)}><Text style={styles.text}>Default</Text></Pressable>
      {examples.map(([w, h]) => <Pressable accessibilityRole="button" accessibilityLabel={`${w}x${h}`} key={w + "-" + h} style={styles.button} onPress={() => choose(`http://localhost:3000/assets/?unstable_path=.%2F.codex-tmp%2Fcover-${w}-${h}.png`)}><Text style={styles.text}>{w}×{h}</Text></Pressable>)}
      <Pressable accessibilityRole="button" accessibilityLabel="404" style={styles.button} onPress={() => choose("http://localhost:3000/missing-live-cover.png")}><Text style={styles.text}>404</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Form" style={styles.button} onPress={() => setForm(value => !value)}><Text style={styles.text}>Form</Text></Pressable>
    </View>
    {form ? <LiveHostSetup settings={settings} onChange={value => { setSettings(value); setSource(value.coverUri); }} onContinue={() => setForm(false)} onBack={() => setForm(false)} activeLive={null} checkingActive={false} endingActive={false} onEndActive={() => {}} /> : <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.text}>Create preview</Text><LiveCoverImage source={source} borderRadius={12} />
      <Text style={styles.text}>Live card</Text><LiveCoverImage source={source} borderRadius={12} />
    </ScrollView>}
  </View>;
}
function App() { return <SafeAreaProvider><ThemeProvider><Preview /></ThemeProvider></SafeAreaProvider>; }
registerRootComponent(App);
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#091725" }, content: { padding: 16, gap: 12 }, buttons: { padding: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }, button: { padding: 8, borderRadius: 6, backgroundColor: "#28425B" }, text: { color: "#FFFFFF" } });
