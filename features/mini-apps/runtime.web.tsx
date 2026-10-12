import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { ExternalConsent, RuntimeConsent } from './consent';
import { useRuntime } from './use-runtime';
import type { AppDetail, Launch } from './types';

export function MiniAppRuntime({ app, launch, onClose }: { app: AppDetail; launch: Launch; onClose: () => void }) {
  const { theme } = useTheme(); const c = theme.colors; const frame = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true); const [timeout, setTimeoutState] = useState(false); const bridge = useRuntime(app, launch, onClose);
  const ready = () => { for (const origin of app.allowedOrigins ?? []) frame.current?.contentWindow?.postMessage(bridge.binding, origin); };
  useEffect(() => {
    const timer = window.setTimeout(() => setTimeoutState(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !app.allowedOrigins?.includes(event.origin)) return;
      const message = event.data;
      if (message?.type === 'ANKT_MINI_APP_HELLO') { setTimeoutState(false); ready(); return; }
      if (message?.type === 'ANKT_MINI_APP_NAVIGATING' && message.appId === app.id && message.sessionId === launch.sessionId && message.nonce === bridge.binding.nonce) { bridge.invalidate(); return; }
      void bridge.handle(message, event.origin, event.source, value => frame.current?.contentWindow?.postMessage(value, event.origin));
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  });
  return <Modal visible animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}><View style={{ flex: 1 }}><Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{app.name}</Text><Text style={{ color: c.textMuted }}>Dịch vụ của {app.developer}</Text></View><Pressable accessibilityRole="button" onPress={onClose}><Text style={{ color: c.text }}>Đóng</Text></Pressable></View>
      {loading && <ActivityIndicator color={c.primary} accessibilityLabel="Đang mở ứng dụng" />}
      {timeout && <Text style={{ color: c.textMuted, padding: 16 }}>Nếu website không hiển thị hoặc trình duyệt chặn cookie, hãy mở website đối tác để tiếp tục.</Text>}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}><a href={launch.launchUrl} target="_blank" rel="noopener noreferrer" style={{ color: c.primary }}>Mở website đối tác ↗</a></View>
      <iframe ref={frame} title={app.name} src={launch.launchUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="no-referrer" allow="" style={{ flex: 1, width: '100%', border: 0 }} onLoad={() => { setLoading(false); ready(); }} />
      <RuntimeConsent permissions={bridge.consent} onChoose={bridge.chooseConsent} />
      <ExternalConsent url={bridge.externalUrl} onChoose={bridge.chooseExternal} />
    </View>
  </Modal>;
}
