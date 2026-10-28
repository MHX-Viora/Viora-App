import { useEffect, useRef } from 'react';
import type { HostProps } from './host';
import { createMiniAppLaunchClient, productionHostOrigin } from '../../../services/mini-app-launch.service';
import { getSession } from '../../../stores/session-store';
import { createProductionTransport } from '../lib/host-transport';
import AuthHost from './auth-host.web';

export default function MiniAppHost(props: HostProps) {
  return process.env.EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED === 'true' ? <AuthHost {...props}/> : <LegacyMiniAppHost {...props}/>;
}
function LegacyMiniAppHost({ appId, attempt, onStatus }: HostProps) {
  const frame = useRef<HTMLIFrameElement>(null), status = useRef(onStatus);
  status.current = onStatus;
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let transport: ReturnType<typeof createProductionTransport> | undefined, stopped = false;
    let deadline: ReturnType<typeof setTimeout>;
    const receive = (event: MessageEvent) => { void transport?.handle(event); };
    const stop = () => { transport?.dispose(); element.src = 'about:blank'; };
    const pageHide = () => { stopped = true; stop(); };
    try {
      const api = process.env.EXPO_PUBLIC_API_URL ?? '', configuredHost = process.env.EXPO_PUBLIC_MINI_APP_HOST_ORIGIN ?? '';
      const origin = productionHostOrigin(configuredHost, window.location.origin, api);
      const client = createMiniAppLaunchClient(api, origin, window.location.origin);
      const requestId = window.crypto.randomUUID();
      transport = createProductionTransport({ hostOrigin: origin, appOrigin: window.location.origin, apiOrigin: api,
        source: () => element.contentWindow, send: message => element.contentWindow?.postMessage(message, origin),
        launch: async (bindingId, browserNonce, signal) => {
          // Snapshot the current Social identity without refreshing, clearing, or silently downgrading it.
          const session = await getSession(); signal.throwIfAborted();
          return client.launch(appId, { requestId, platform: 'Web', bindingId, browserNonce }, session?.accessToken ?? null, signal);
        },
        status: value => {
          if (stopped) return;
          if (value === 'host.running' || value === 'launch.failed' || value === 'host.error' || value.startsWith('host.close')) clearTimeout(deadline);
          if (value === 'launch.failed' || value === 'host.error' || value.startsWith('host.close')) element.src = 'about:blank';
          status.current(value);
        },
      });
      window.addEventListener('message', receive); window.addEventListener('pagehide', pageHide);
      deadline = setTimeout(() => { if (!stopped) { stop(); status.current('launch.failed'); } }, 45000);
      element.src = origin + '/mini-app-host';
    } catch { status.current('host.error'); }
    return () => {
      stopped = true; clearTimeout(deadline); stop();
      window.removeEventListener('message', receive); window.removeEventListener('pagehide', pageHide);
    };
  }, [appId, attempt]);
  return <iframe ref={frame} title="Nội dung Mini App" referrerPolicy="no-referrer"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
    allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'"
    style={{ border: 0, width: '100%', height: '100%', minHeight: 320, flex: 1 }} />;
}
