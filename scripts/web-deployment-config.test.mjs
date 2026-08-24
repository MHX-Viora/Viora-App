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
});
