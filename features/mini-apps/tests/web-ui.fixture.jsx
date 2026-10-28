// UI-only fixture: real components/state, simulated catalog and host. No business acceptance.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MiniAppSection } from '../../../components/mini-apps/mini-app-section';
import { MiniAppHostScreen } from '../mini-app-host-screen';

const appId = index => 'app_' + String.fromCharCode(97 + index).repeat(43);
const items = Array.from({ length: 24 }, (_, index) => ({ id: appId(index),
  name: index === 0 ? '<script>alert(1)</script>' : `Tiện ích ${index + 1} với tên rất dài để kiểm tra bố cục`,
  description: 'Fixture only', logoUrl: null, category: 'utilities', version: '1.0' }));
export const fixture = { mode: 'ready', listCalls: 0, detailCalls: 0, mounts: 0, disposed: 0, route: null,
  listeners: new Set() };
export function navigate(route) { fixture.route = route; fixture.listeners.forEach(listener => listener(route)); }
export const miniAppCatalog = {
  async list(page, pageSize, signal) {
    fixture.listCalls++;
    await new Promise(resolve => setTimeout(resolve, 120)); signal?.throwIfAborted();
    if (fixture.mode === 'error') throw new Error('FIXTURE_OFFLINE');
    const data = fixture.mode === 'empty' ? [] : items;
    return { items: data.slice((page - 1) * pageSize, page * pageSize), total: data.length, page, pageSize };
  },
  async detail(id, signal) {
    fixture.detailCalls++;
    await new Promise(resolve => setTimeout(resolve, 120)); signal?.throwIfAborted();
    if (fixture.mode === 'error') throw new Error('FIXTURE_OFFLINE');
    return { app: items.find(item => item.id === id), canOpen: true, loginAvailable: false,
      capabilities: ['platform.getContext', 'platform.close'] };
  },
};
export function FixtureHost({ onStatus }) {
  useEffect(() => { fixture.mounts++; onStatus('host.running'); return () => { fixture.disposed++; }; }, [onStatus]);
  return <div aria-label="Simulated host">
    <button onClick={() => onStatus('bridge.connected')}>Fixture: SDK connected</button>
    <button onClick={() => onStatus('website.loaded')}>Fixture: website loaded</button>
    <button onClick={() => onStatus('host.error')}>Fixture: session revoked</button>
    <button onClick={() => onStatus('host.closed')}>Fixture: confirmed close</button>
  </div>;
}
function App() {
  const [route, setRoute] = useState(null);
  useEffect(() => { fixture.listeners.add(setRoute); return () => { fixture.listeners.delete(setRoute); }; }, []);
  return <SafeAreaProvider>{route ? <MiniAppHostScreen key={route} appId={route} /> : <main style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
    <h1>UI fixture — simulated services</h1>
    <nav aria-label="Fixture controls">{['ready', 'error', 'empty'].map(mode =>
      <button key={mode} onClick={() => { fixture.mode = mode; window.dispatchEvent(new Event('online')); }}>{mode}</button>)}</nav>
    <section aria-label="Wallet sentinel"><h2>Ví ANKT</h2><p>Wallet fixture remains visible independently of catalog.</p></section>
    <MiniAppSection onOpen={navigate} />
  </main>}</SafeAreaProvider>;
}
Object.assign(window, { __miniAppUi: fixture });
createRoot(document.getElementById('root')).render(<App />);
