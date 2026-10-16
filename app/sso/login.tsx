import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { completeFirstPartySso, SsoBootstrapError } from "@/features/sso/bootstrap";
import { ensureFreshSession, refreshRejectedAccessToken } from "@/services/authenticated-fetch";
import { clearSsoReturn, rememberSsoReturn } from "@/utils/sso-return";
import { useTheme } from "@/theme";

export default function SsoLoginPage() {
  const { transaction } = useLocalSearchParams<{ transaction?: string }>();
  const { theme } = useTheme();
  const [retry, setRetry] = useState(0); const [error, setError] = useState("");
  useEffect(() => {
    if (Platform.OS !== "web") { setError("Hãy mở Mini App trong trình duyệt ANKT."); return; }
    let active = true; const controller = new AbortController(); setError("");
    const meta = document.createElement("meta"); meta.name = "referrer"; meta.content = "no-referrer"; document.head.appendChild(meta);
    void completeFirstPartySso({ issuer: process.env.EXPO_PUBLIC_ANKT_SSO_ISSUER ?? "", transaction: transaction ?? "",
      loadSession: ensureFreshSession, refreshSession: refreshRejectedAccessToken, signal: controller.signal,
    }).then(url => { if (active) { clearSsoReturn(); window.location.assign(url); } }).catch(reason => {
      if (!active) return;
      if (reason instanceof SsoBootstrapError && reason.code === "ANKT_LOGIN_REQUIRED" && transaction) {
        rememberSsoReturn(transaction); router.replace("/login"); return;
      }
      setError(reason instanceof SsoBootstrapError ? reason.message : "Không thể kết nối ANKT. Hãy thử lại.");
    });
    return () => { active = false; controller.abort(); meta.remove(); };
  }, [transaction, retry]);
  return <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
    <View style={styles.content}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>Đăng nhập ANKT</Text>
      {error ? <>
        <Text accessibilityRole="alert" style={[styles.message, { color: theme.colors.text }]}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => setRetry(x => x + 1)} style={[styles.button, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.buttonLabel, { color: theme.colors.primaryContrast }]}>Thử lại</Text>
        </Pressable>
      </> : <View accessibilityLiveRegion="polite" style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.message, { color: theme.colors.text }]}>Đang xác thực để tiếp tục vào Mini App…</Text>
      </View>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  content: { width: "100%", maxWidth: 440, gap: 20 }, title: { fontSize: 24, fontWeight: "700" },
  message: { fontSize: 16, lineHeight: 24 }, loading: { gap: 16 },
  button: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 8, alignSelf: "flex-start" },
  buttonLabel: { fontWeight: "600", fontSize: 16 },
});
