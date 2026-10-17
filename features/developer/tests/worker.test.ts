import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import vm from "node:vm";
import test from "node:test";

const worker = readFileSync(new URL("../../../public/firebase-messaging-sw.js", import.meta.url), "utf8");

function fixture(offline = false) {
  const listeners = new Map<string, (event: unknown) => void>();
  const writes: string[] = [];
  const cache = { put: async (key: string) => { writes.push(key); }, match: async () => new Response("ANKT shell") };
  vm.runInNewContext(worker, {
    self: { location: new URL("https://mxh.ankt.vn/firebase-messaging-sw.js"), addEventListener: (name: string, handler: (event: unknown) => void) => listeners.set(name, handler) },
    URL, Response, console,
    caches: { open: async () => cache },
    fetch: async () => { if (offline) throw new Error("Offline"); return new Response("network document"); },
  });
  return {
    writes,
    async navigate(path: string) {
      let response: Promise<Response> | undefined;
      listeners.get("fetch")!({ request: { url: `https://mxh.ankt.vn${path}`, method: "GET", mode: "navigate" }, respondWith: (value: Promise<Response>) => { response = value; } });
      if (response) await response;
      return response !== undefined;
    },
  };
}

test("ANKT worker keeps Developer account pages and APIs on the network", async () => {
  for (const offline of [false, true]) {
    const host = fixture(offline);
    for (const path of ["/developers", "/developers/", "/developers/docs", "/developers/login", "/developers/_next/app.js", "/developers/api/health"]) {
      assert.equal(await host.navigate(path), false, path);
    }
    assert.deepEqual(host.writes, []);
  }
});

test("ANKT worker preserves existing ANKT navigation cache behavior", async () => {
  const host = fixture();
  assert.equal(await host.navigate("/"), true);
  assert.equal(await host.navigate("/developers-other"), true);
  assert.deepEqual(host.writes, ["/", "/"]);
  assert.equal(await fixture(true).navigate("/"), true);
});
