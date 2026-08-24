import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createWebSessionStorage } from "./session-storage.web.ts";

test("web session storage persists values in the provided browser storage", async () => {
  const values = new Map();
  const browserStorage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
  const storage = createWebSessionStorage(() => browserStorage);

  await storage.setItemAsync("session", "saved");
  assert.equal(await storage.getItemAsync("session"), "saved");
  await storage.deleteItemAsync("session");
  assert.equal(await storage.getItemAsync("session"), null);
});

test("web session storage is safe when browser storage is unavailable", async () => {
  const storage = createWebSessionStorage(() => {
    throw new Error("storage unavailable");
  });

  await storage.setItemAsync("session", "memory fallback");
  assert.equal(await storage.getItemAsync("session"), "memory fallback");
  await storage.deleteItemAsync("session");
  assert.equal(await storage.getItemAsync("session"), null);
});

test("web access tokens use per-tab storage instead of persistent local storage", () => {
  const source = readFileSync(
    new URL("./session-storage.web.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /globalThis\.sessionStorage/);
  assert.doesNotMatch(source, /globalThis\.localStorage/);
});

test("shared session store does not import platform APIs directly", () => {
  const source = readFileSync(new URL("./session-store.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /expo-secure-store|Platform\.OS|localStorage/);
  assert.match(source, /session-storage/);
});
