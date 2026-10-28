import { readMiniAppDetail, readMiniAppPage, validMiniAppId } from "../features/mini-apps/lib/contracts";

export function createMiniAppCatalogClient(baseUrl: string, transport: typeof fetch = fetch) {
  async function get(path: string, signal?: AbortSignal): Promise<unknown> {
    const response = await transport(`${baseUrl}${path}`, {
      method: "GET", headers: { Accept: "application/json" }, credentials: "omit", cache: "no-store", redirect: "error", signal,
    });
    if (!response.ok) throw new Error(response.status === 404 ? "APP_NOT_FOUND" : "CATALOG_UNAVAILABLE");
    const body = await response.text();
    if (body.length > 1_000_000) throw new Error("INVALID_CATALOG_RESPONSE");
    try { return JSON.parse(body); } catch { throw new Error("INVALID_CATALOG_RESPONSE"); }
  }
  return {
    async list(page = 1, pageSize = 20, signal?: AbortSignal) {
      if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
        throw new Error("INVALID_CATALOG_PAGE");
      return readMiniAppPage(await get(`/api/mini-apps?page=${page}&pageSize=${pageSize}`, signal), page, pageSize);
    },
    async detail(appId: string, signal?: AbortSignal) {
      if (!validMiniAppId(appId)) throw new Error("INVALID_APP_ID");
      return readMiniAppDetail(await get(`/api/mini-apps/${appId}`, signal), appId);
    },
  };
}
export const miniAppCatalog = createMiniAppCatalogClient(process.env.EXPO_PUBLIC_API_URL ?? "");
