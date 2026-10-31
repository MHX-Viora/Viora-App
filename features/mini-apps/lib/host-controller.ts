import { validMiniAppId, type MiniAppDetail } from './contracts';

export const miniAppsEnabled = true;
export const isPublicMiniAppRoute = (segments: readonly string[], enabled: boolean) =>
  enabled && segments.length === 2 && segments[0] === 'mini-apps' && segments[1] === '[appId]';
type State = { phase: 'idle' | 'loading' | 'running' | 'failed' | 'closed'; detail: MiniAppDetail | null; attempt: number; status: string };
type Reader = { detail: (appId: string, signal?: AbortSignal) => Promise<MiniAppDetail> };
const runtimeStatuses = new Set(['launch.granted', 'host.running', 'website.loaded', 'bridge.connected', 'bridge.disconnected', 'bridge.unavailable', 'host.paused', 'host.resumed']);
export class MiniAppHostController {
  private value: State = { phase: 'idle', detail: null, attempt: 0, status: 'starting' };
  private readonly listeners = new Set<() => void>();
  private generation = 0;
  private request?: AbortController;
  constructor(private readonly appId: string, private readonly reader: Reader, private readonly invalidate: (appId: string) => void) {}
  snapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(value: Partial<State>) { this.value = { ...this.value, ...value }; this.listeners.forEach(listener => listener()); }
  open = async () => {
    if (this.value.phase === 'loading') return;
    const generation = ++this.generation; this.request?.abort(); const request = this.request = new AbortController();
    this.set({ phase: 'loading', status: 'starting' });
    try {
      if (!validMiniAppId(this.appId)) throw new Error('INVALID_APP_ID');
      const detail = await this.reader.detail(this.appId, request.signal);
      if (generation !== this.generation || request.signal.aborted) return;
      if (detail.app.id !== this.appId || !detail.canOpen) throw new Error('APP_NOT_FOUND');
      this.set({ phase: 'running', detail, attempt: this.value.attempt + 1 });
    } catch {
      if (generation !== this.generation || request.signal.aborted) return;
      this.invalidate(this.appId); this.set({ phase: 'failed', status: 'launch.failed' });
    }
  };
  hostStatus = (status: string) => {
    if (this.value.phase !== 'running') return;
    if (status === 'website.loaded' && this.value.status === 'bridge.connected') return;
    if (status === 'launch.failed' || status === 'host.error') {
      this.invalidate(this.appId); this.set({ phase: 'failed', status });
    } else if (status === 'host.closed' || status === 'host.close_unconfirmed') {
      this.set({ phase: 'closed', status });
    } else if (runtimeStatuses.has(status)) this.set({ status });
  };
  close = () => {
    this.generation++; this.request?.abort(); this.set({ phase: 'closed', status: 'host.close_unconfirmed' });
  };
}
