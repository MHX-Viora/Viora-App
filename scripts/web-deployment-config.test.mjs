import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("Web exports as an SPA with a direct-route fallback", async () => {
  const appConfig = JSON.parse(
    await readFile(new URL("app.json", projectRoot), "utf8"),
  );
  const vercelConfig = JSON.parse(
    await readFile(new URL("vercel.json", projectRoot), "utf8"),
  );

  assert.equal(appConfig.expo.web.output, "single");
  assert.ok(
    vercelConfig.rewrites.some((rewrite) => rewrite.destination === "/"),
    "Vercel must route direct browser URLs through the SPA entry point",
  );

  const fallback = vercelConfig.rewrites.find((rewrite) => rewrite.destination === "/");
  const fallbackPattern = new RegExp(`^${fallback.source}$`);
  for (const pwaAsset of [
    "/manifest.webmanifest",
    "/firebase-messaging-sw.js",
    "/pwa-icon-192.png",
    "/pwa-icon-512.png",
  ]) {
    assert.equal(
      fallbackPattern.test(pwaAsset),
      false,
      `${pwaAsset} must be served as a static file instead of the SPA shell`,
    );
  }

  const workerHeaders = vercelConfig.headers?.find(
    (entry) => entry.source === "/firebase-messaging-sw.js",
  );
  assert.ok(workerHeaders, "Service Worker must have an explicit revalidation policy");
  assert.ok(
    workerHeaders.headers.some(
      (header) =>
        header.key.toLowerCase() === "cache-control" &&
        header.value.includes("no-cache"),
    ),
    "Service Worker must revalidate after a deployment",
  );
});
