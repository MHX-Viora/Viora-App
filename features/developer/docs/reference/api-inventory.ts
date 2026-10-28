import inventory from './api-inventory.json';
import partnerInventory from './partner-inventory.json';

export type ApiEndpoint = { id: string; group: string; method: string; path: string; description: string;
  query?: string; bodyFormat?: string; request: string | null; response: string | null; success: number; rate: string };
export const apiInventory: readonly ApiEndpoint[] = [...inventory, ...partnerInventory];
const groups = new Set(['apps', 'integration', 'sso', 'versions', 'reviews', 'publishing', 'catalog', 'account', 'sandbox']);
export function validateInventory(entries: readonly ApiEndpoint[]) {
  const ids = new Set<string>(), operations = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.method} ${entry.path}`;
    const management = /^\/api\/developer\/mini-apps(?:$|\/)/.test(entry.path);
    const catalog = /^\/api\/mini-apps(?:\/\{appId\})?$/.test(entry.path);
    const account = /^\/developers\/api\/account\/(?:auth\/[a-z-]+|profile|sessions(?:\/\{id\})?)$/.test(entry.path);
    if ((!management && !catalog && !account) || /(?:admin|internal|mini-app-host|launch|credential)/i.test(entry.path) ||
      !groups.has(entry.group) || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(entry.method) ||
      !entry.description.trim() || !entry.rate || !entry.id || ids.has(entry.id) || operations.has(key) ||
      ![200, 201, 202, 204].includes(entry.success)) throw new Error(`Invalid public reference: ${entry.id}`);
    ids.add(entry.id); operations.add(key);
  }
}
