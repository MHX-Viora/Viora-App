import { useEffect, useRef, useState, type Ref } from 'react';
import { AppState, BackHandler, Platform, View, type ViewProps } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import { randomUUID } from 'expo-crypto';
import type { HostProps } from './host';
import { createNativeHostChannel } from '../lib/native-host-channel';
import { nativeHostUrl } from '../lib/native-navigation';
import { createMiniAppLaunchClient, productionHostOrigin } from '../../../services/mini-app-launch.service';
import { getSession } from '../../../stores/session-store';
import AuthHost from './auth-host.native';

type Methods = { send: (value: string) => Promise<void>; stop: () => Promise<void> };
type Props = ViewProps & { configuration: { origin: string; url: string }; ref?: Ref<Methods>;
  onHostMessage: (event: { nativeEvent: unknown }) => void; onHostError: () => void };

// Auth Bridge is the default. The custom legacy module is resolved only when
// explicitly selected and missing modules fail safely without a render crash.
export default function MiniAppHost(props: HostProps) {
  const legacy = process.env.EXPO_PUBLIC_MINI_APP_RUNTIME_ENABLED === 'true' && process.env.EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED !== 'true';
  return legacy ? <LegacyMiniAppHost {...props}/> : <AuthHost {...props}/>;
}
function LegacyMiniAppHost({ appId, attempt, onStatus }: HostProps) {
  const view = useRef<Methods>(null), status = useRef(onStatus);
  const channel = useRef<ReturnType<typeof createNativeHostChannel> | null>(null);
  const terminal = useRef<(value: string) => void>(() => {});
  const [configuration, setConfiguration] = useState<Props['configuration'] | null>(null);
  const [NativeView, setNativeView] = useState<ReturnType<typeof requireNativeViewManager<Props>> | null>(null);
  status.current = onStatus;
  useEffect(() => {
    let ended = false;
    let deadline: ReturnType<typeof setTimeout>;
    const stopView = () => { const native = view.current; view.current = null; void native?.stop().catch(() => {}); };
    const finish = (value: string) => {
      if (ended) return;
      ended = true; clearTimeout(deadline); channel.current?.dispose();
      stopView(); setConfiguration(null); status.current(value);
    };
    terminal.current = finish;
    try {
      if (!['android', 'ios'].includes(Platform.OS) || !requireOptionalNativeModule('MiniAppHost')) throw Error('NATIVE_HOST_UNAVAILABLE');
      const app = process.env.EXPO_PUBLIC_APP_ORIGIN ?? '', api = process.env.EXPO_PUBLIC_API_URL ?? '';
      const origin = productionHostOrigin(process.env.EXPO_PUBLIC_MINI_APP_HOST_ORIGIN ?? '', app, api);
      const client = createMiniAppLaunchClient(api, origin, app), requestId = randomUUID();
      channel.current = createNativeHostChannel({ hostOrigin: origin, apiOrigin: api, appOrigin: app,
        send: value => { void view.current?.send(value).catch(() => finish('host.error')); },
        launch: async (bindingId, browserNonce, signal) => {
          const session = await getSession(); signal.throwIfAborted();
          return client.launch(appId, { requestId, platform: Platform.OS === 'ios' ? 'iOS' : 'Android', bindingId, browserNonce }, session?.accessToken ?? null, signal);
        },
        status: value => {
          if (ended) return;
          if (value === 'launch.failed' || value === 'host.error' || value.startsWith('host.close')) { finish(value); return; }
          if (value === 'host.running') clearTimeout(deadline);
          status.current(value);
        },
      });
      setNativeView(() => requireNativeViewManager<Props>('MiniAppHost'));
      setConfiguration({ origin, url: nativeHostUrl(origin + '/mini-app-host', origin) });
      deadline = setTimeout(() => finish('launch.failed'), 45000);
    } catch { finish('host.error'); }
    const appState = AppState.addEventListener('change', value => { if (value !== 'active') finish('host.close_unconfirmed'); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { finish('host.close_unconfirmed'); return false; });
    return () => {
      ended = true; clearTimeout(deadline); channel.current?.dispose(); channel.current = null;
      stopView(); appState.remove(); back.remove();
    };
  }, [appId, attempt]);
  return <View style={{ flex: 1 }}>
    {configuration && NativeView ? <NativeView ref={native => { if (native) view.current = native; }} style={{ flex: 1 }} configuration={configuration}
      onHostMessage={event => { void channel.current?.receive(event.nativeEvent); }}
      onHostError={() => terminal.current('host.error')} /> : null}
  </View>;
}
