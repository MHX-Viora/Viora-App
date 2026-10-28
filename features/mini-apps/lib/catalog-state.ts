import { MiniAppCatalogCache } from "./catalog-cache";
import type { MiniAppItem, MiniAppPage } from "./contracts";

type CatalogReader = { list: (page: number, pageSize: number, signal?: AbortSignal) => Promise<MiniAppPage> };
type State = { items: MiniAppItem[]; page: number; total: number; loading: boolean; error: string | null };
export class MiniAppCatalogState {
  private value: State;
  private generation = 0;
  private request?: AbortController;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly client: CatalogReader, private readonly cache: MiniAppCatalogCache) {
    const cached = cache.get(1, 20);
    this.value = { items: cached?.items ?? [], page: cached?.page ?? 0, total: cached?.total ?? 0, loading: !cached, error: null };
  }
  snapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(value: Partial<State>) { this.value = { ...this.value, ...value }; this.listeners.forEach(listener => listener()); }
  refresh = () => this.load(1);
  more = async () => {
    if (!this.value.loading && !this.value.error && this.value.page * 20 < this.value.total) await this.load(this.value.page + 1);
  };
  stop = () => { this.generation++; this.request?.abort(); this.set({ loading: false }); };
  private async load(page: number) {
    this.request?.abort(); const request = new AbortController(); this.request = request; const generation = ++this.generation;
    this.set({ loading: true, error: null });
    try {
      const result = await this.client.list(page, 20, request.signal);
      if (generation !== this.generation || request.signal.aborted) return;
      this.cache.set(result);
      const items = page === 1 ? result.items : [...this.value.items, ...result.items];
      this.set({ items: [...new Map(items.map(item => [item.id, item])).values()], page, total: result.total });
    } catch {
      if (generation !== this.generation || request.signal.aborted) return;
      if (page === 1) this.cache.clear();
      this.set({ error: "Không thể tải Mini App. Vui lòng thử lại.", ...(page === 1 ? { items: [], page: 0, total: 0 } : {}) });
    } finally {
      if (generation === this.generation) this.set({ loading: false });
    }
  }
}
