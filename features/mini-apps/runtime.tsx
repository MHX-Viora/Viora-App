import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { allowedNavigation, safeExternalUrl } from './bridge.mjs';
import { ExternalConsent, RuntimeConsent } from './consent';
import { useRuntime } from './use-runtime';
import type { AppDetail, Launch } from './types';

export function MiniAppRuntime({ app, launch, onClose }: { app: AppDetail; launch: Launch; onClose: () => void }) {
  const { theme } = useTheme(); const c = theme.colors; const web = useRef<WebView>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [back, setBack] = useState(false); const [external, setExternal] = useState('');
  const bridge = useRuntime(app, launch, onClose);
  const host = new URL(launch.launchUrl).hostname;
  const sendReady = () => { web.current?.injectJavaScript(`window.__ANKT_NATIVE_READY__&&window.__ANKT_NATIVE_READY__(${JSON.stringify(bridge.binding)});true;`); };
  const oauthOrigin = new URL(process.env.EXPO_PUBLIC_OPEN_API_ISSUER || process.env.EXPO_PUBLIC_API_URL || 'https://api.ankt.vn').origin;
  const safeNavigate = (url: string) => {
    if (allowedNavigation(url, launch.allowedDomains)) return true;
    try { const target = new URL(url); if (target.origin === oauthOrigin && target.pathname === '/oauth/authorize') return true; } catch { return false; }
    const target = safeExternalUrl(url); if (target) setExternal(target); return false;
  };
  return <Modal visible animationType="slide" onRequestClose={() => back ? web.current?.goBack() : onClose()}>
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" disabled={!back} onPress={() => web.current?.goBack()} style={{ padding: 8 }}><Text style={{ color: back ? c.text : c.textMuted }}>‹</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={{ color: c.text, fontWeight: '700' }}>{app.name}</Text><Text style={{ color: c.textMuted, fontSize: 12 }}>{host} · Dịch vụ đối tác</Text></View>
        <Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 10 }}><Text style={{ color: c.text }}>Đóng</Text></Pressable>
      </View>
      {loading && <ActivityIndicator accessibilityLabel="Đang mở ứng dụng" color={c.primary} />}
      {error ? <View style={{ padding: 24, gap: 16 }}><Text accessibilityRole="alert" style={{ color: c.danger }}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { setError(''); web.current?.reload(); }}><Text style={{ color: c.primary }}>Tải lại</Text></Pressable></View> : null}
      <WebView key={launch.sessionId} ref={web} source={{ uri: launch.launchUrl }} style={{ flex: 1, opacity: error ? 0 : 1 }}
        incognito sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} cacheEnabled={false} cacheMode="LOAD_NO_CACHE"
        allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false} mixedContentMode="never"
        javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows allowsLinkPreview={false} geolocationEnabled={false}
        originWhitelist={['https://*']} webviewDebuggingEnabled={false} mediaCapturePermissionGrantType="deny"
        onShouldStartLoadWithRequest={request => safeNavigate(request.url)}
        onOpenWindow={event => { const target = safeExternalUrl(event.nativeEvent.targetUrl); if (target) setExternal(target); }}
        onLoadStart={() => { setLoading(true); bridge.invalidate(); }} onLoadEnd={() => { setLoading(false); sendReady(); }}
        onNavigationStateChange={state => setBack(state.canGoBack)} onError={() => { setLoading(false); setError('Không thể tải website đối tác. Kiểm tra kết nối và thử lại.'); }}
        onHttpError={event => { if (event.nativeEvent.statusCode >= 400) setError('Website đối tác đang gặp lỗi.'); }}
        onMessage={event => {
          let message; try { if (event.nativeEvent.data.length > 16384) return; message = JSON.parse(event.nativeEvent.data); } catch { return; }
          let origin; try { origin = new URL(event.nativeEvent.url).origin; } catch { return; }
          if (!app.allowedOrigins.includes(origin)) return;
          if (message.type === 'ANKT_MINI_APP_HELLO') { sendReady(); return; }
          void bridge.handle(message, origin, web, value => web.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(value)}}));true;`));
        }} />
      {!!external && <View style={{ padding: 20, gap: 12, backgroundColor: c.card }}><Text style={{ color: c.text }}>Mở website bên ngoài: {new URL(external).hostname}?</Text><Pressable accessibilityRole="button" onPress={() => { void Linking.openURL(external); setExternal(''); }}><Text style={{ color: c.primary }}>Mở bằng trình duyệt</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setExternal('')}><Text style={{ color: c.text }}>Hủy</Text></Pressable></View>}
      <RuntimeConsent permissions={bridge.consent} onChoose={bridge.chooseConsent} />
      <ExternalConsent url={bridge.externalUrl} onChoose={bridge.chooseExternal} />
    </SafeAreaView>
  </Modal>;
}
