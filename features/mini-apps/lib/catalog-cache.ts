import type { MiniAppPage } from "./contracts";

const copyPage = (page: MiniAppPage): MiniAppPage => ({ ...page, items: page.items.map(item => ({ ...item })) });

// Display only: launch authorization must always use a fresh server request.
export class MiniAppCatalogCache {
  private readonly entries = new Map<string, { page: MiniAppPage; expiresAt: number }>();
  constructor(private readonly now = () => Date.now()) {}
  get(page: number, pageSize: number): MiniAppPage | undefined {
    const key = `${page}:${pageSize}`; const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) { this.entries.delete(key); return undefined; }
    return copyPage(entry.page);
  }
  set(page: MiniAppPage) {
    const key = `${page.page}:${page.pageSize}`;
    this.entries.delete(key);
    this.entries.set(key, { page: copyPage(page), expiresAt: this.now() + 30_000 });
    if (this.entries.size > 5) this.entries.delete(this.entries.keys().next().value!);
  }
  invalidate(appId: string) {
    for (const [key, value] of this.entries) if (value.page.items.some(x => x.id === appId)) this.entries.delete(key);
  }
  clear() { this.entries.clear(); }
}
export const miniAppCatalogCache = new MiniAppCatalogCache();
