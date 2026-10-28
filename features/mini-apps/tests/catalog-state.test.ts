import assert from "node:assert/strict";
import test from "node:test";
import { MiniAppCatalogState } from "../lib/catalog-state";
import { MiniAppCatalogCache } from "../lib/catalog-cache";
import type { MiniAppPage } from "../lib/contracts";

const item = (c: string) => ({ id: "app_" + c.repeat(43), name: c, logoUrl: null, description: null, category: "utilities", version: "1.0" });
const page = (c: string, p = 1): MiniAppPage => ({ items: [item(c)], page: p, pageSize: 20, total: 21 });
test("late aborted response cannot replace fresh list or update disposed state", async () => {
  const pending: ((page: MiniAppPage) => void)[] = []; const signals: AbortSignal[] = [];
  const state = new MiniAppCatalogState({ list: async (_p, _size, signal) => {
    signals.push(signal!); return new Promise(resolve => pending.push(resolve));
  } }, new MiniAppCatalogCache());
  assert.equal(state.snapshot().loading, true);
  const older = state.refresh(); const newer = state.refresh();
  assert.equal(signals[0].aborted, true);
  pending[1](page("b")); await newer;
  pending[0](page("a")); await older;
  assert.equal(state.snapshot().items[0].name, "b");
  const last = state.refresh(); state.stop(); pending[2](page("c")); await last;
  assert.equal(state.snapshot().items[0].name, "b"); assert.equal(state.snapshot().loading, false);
});
test("pagination prevents duplicate requests, deduplicates shifting rows and recovers from errors", async () => {
  let calls = 0; let fail = false;
  const state = new MiniAppCatalogState({ list: async p => {
    calls++; if (fail) throw new Error("provider secret");
    return p === 1 ? page("a") : { ...page("b", p), items: [item("a"), item("b")] };
  } }, new MiniAppCatalogCache());
  await state.refresh();
  await Promise.all([state.more(), state.more()]);
  assert.equal(calls, 2); assert.deepEqual(state.snapshot().items.map(x => x.name), ["a", "b"]);
  fail = true; await state.refresh();
  assert.equal(state.snapshot().error, "Không thể tải Mini App. Vui lòng thử lại.");
  assert.equal(state.snapshot().loading, false); assert.deepEqual(state.snapshot().items, []);
  fail = false; await state.refresh(); assert.equal(state.snapshot().error, null);
});
