import assert from "node:assert/strict";
import test from "node:test";
import { createMiniAppCatalogClient } from "../../../services/mini-app.service";
import { MiniAppCatalogCache } from "../lib/catalog-cache";

const item = { id: "app_" + "a".repeat(43), name: "Ứng dụng", logoUrl: "https://partner.example/logo.png", description: "Mô tả", category: "utilities", version: "1.0" };
const page = { items: [item], page: 1, pageSize: 20, total: 1 };

test("catalog uses anonymous no-store bounded GET and propagates abort", async () => {
  const abort = new AbortController(); let calls = 0;
  const client = createMiniAppCatalogClient("https://api.example", async (url, init) => {
    calls++;
    assert.equal(url, "https://api.example/api/mini-apps?page=1&pageSize=20");
    assert.equal(init?.credentials, "omit"); assert.equal(init?.cache, "no-store");
    assert.equal(init?.signal, abort.signal);
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    return Response.json(page);
  });
  assert.deepEqual(await client.list(1, 20, abort.signal), page);
  await assert.rejects(() => client.list(0, 20), /INVALID_CATALOG_PAGE/);
  assert.equal(calls, 1);
});

test("untrusted response rejects injected fields, invalid IDs, unsafe logos and broken paging", async () => {
  for (const data of [
    { ...page, items: [{ ...item, websiteUrl: "https://unreviewed.example" }] },
    { ...page, items: [{ ...item, id: "draft" }] },
    { ...page, items: [{ ...item, logoUrl: "javascript:alert(1)" }] },
    { ...page, page: 2 }, { ...page, total: 0 }, { ...page, items: [item, item] },
  ]) {
    const client = createMiniAppCatalogClient("https://api.example", async () => Response.json(data));
    await assert.rejects(() => client.list(), /INVALID_CATALOG_RESPONSE/);
  }
  const client = createMiniAppCatalogClient("https://api.example", async () => new Response("database password exception", { status: 503 }));
  await assert.rejects(() => client.list(), error => error instanceof Error && error.message === "CATALOG_UNAVAILABLE");
});

test("detail accepts only public metadata and negotiated v1 capabilities", async () => {
  const client = createMiniAppCatalogClient("https://api.example", async () => Response.json({ app: item, canOpen: true, loginAvailable: false, capabilities: ["platform.getContext", "platform.close"] }));
  assert.equal((await client.detail(item.id)).app.id, item.id);
  await assert.rejects(() => client.detail("../../wallet"), /INVALID_APP_ID/);
});

test("display cache expires at 30 seconds, bounds entries and supports invalidation", () => {
  let now = 0; const cache = new MiniAppCatalogCache(() => now);
  cache.set(page); assert.deepEqual(cache.get(1, 20), page);
  now = 30_000; assert.equal(cache.get(1, 20), undefined);
  cache.set(page); cache.invalidate(item.id); assert.equal(cache.get(1, 20), undefined);
  for (let p = 1; p <= 6; p++) cache.set({ ...page, page: p, items: [], total: 200 });
  assert.equal(cache.get(1, 20), undefined);
  cache.clear(); assert.equal(cache.get(6, 20), undefined);
});
