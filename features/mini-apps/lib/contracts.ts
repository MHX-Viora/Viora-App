export type MiniAppItem = {
  id: string; name: string; logoUrl: string | null; description: string | null; category: string; version: string;
};
export type MiniAppPage = { items: MiniAppItem[]; page: number; pageSize: number; total: number };
export type MiniAppDetail = { app: MiniAppItem; canOpen: boolean; loginAvailable: boolean; capabilities: string[] };
export const validMiniAppId = (value: string) => /^app_[A-Za-z0-9_-]{43}$/.test(value);

function invalid(): never { throw new Error("INVALID_CATALOG_RESPONSE"); }
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  if (Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value, key))) return invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || [...value].length > max || (!nullable && !value.trim())) return invalid();
  return value;
}
export function readMiniAppItem(value: unknown): MiniAppItem {
  const row = record(value, ["id", "name", "logoUrl", "description", "category", "version"]);
  const id = text(row.id, 47)!; if (!validMiniAppId(id)) return invalid();
  const logoUrl = text(row.logoUrl, 2048, true);
  if (logoUrl !== null) {
    let url: URL; try { url = new URL(logoUrl); } catch { return invalid(); }
    if (url.protocol !== "https:" || url.username || url.password) return invalid();
  }
  return { id, name: text(row.name, 120)!, logoUrl, description: text(row.description, 300, true), category: text(row.category, 50)!, version: text(row.version, 80)! };
}
export function readMiniAppPage(value: unknown, page: number, pageSize: number): MiniAppPage {
  const row = record(value, ["items", "page", "pageSize", "total"]);
  if (row.page !== page || row.pageSize !== pageSize || !Number.isSafeInteger(row.total) || (row.total as number) < 0 ||
    !Array.isArray(row.items) || row.items.length > pageSize) return invalid();
  const items = row.items.map(readMiniAppItem); const total = row.total as number;
  if (new Set(items.map(x => x.id)).size !== items.length || items.length > Math.max(0, total - (page - 1) * pageSize)) return invalid();
  return { items, page, pageSize, total };
}
export function readMiniAppDetail(value: unknown, appId: string): MiniAppDetail {
  const row = record(value, ["app", "canOpen", "loginAvailable", "capabilities"]);
  const app = readMiniAppItem(row.app);
  if (app.id !== appId || typeof row.canOpen !== "boolean" || typeof row.loginAvailable !== "boolean" ||
    !Array.isArray(row.capabilities) || row.capabilities.length > 2 || new Set(row.capabilities).size !== row.capabilities.length ||
    row.capabilities.some(x => x !== "platform.getContext" && x !== "platform.close")) return invalid();
  return { app, canOpen: row.canOpen, loginAvailable: row.loginAvailable, capabilities: row.capabilities };
}
