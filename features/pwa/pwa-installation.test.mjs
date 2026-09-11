import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

import {
  getInitialInstallMethod,
  getInitialInstallState,
  isIosSafariInstallCandidate,
  isStandaloneDisplay,
} from "./install-policy.ts";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("standalone detection supports display-mode and legacy iOS navigator flag", () => {
  assert.equal(isStandaloneDisplay(true, false), true);
  assert.equal(isStandaloneDisplay(false, true), true);
  assert.equal(isStandaloneDisplay(false, false), false);
});

test("manual install fallback is limited to iOS Safari", () => {
  const safari =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";
  const chrome =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1";
  assert.equal(isIosSafariInstallCandidate(safari, "iPhone", 5), true);
  assert.equal(isIosSafariInstallCandidate(chrome, "iPhone", 5), false);
  assert.equal(isIosSafariInstallCandidate(safari, "Win32", 0), false);
});

test("initial state exposes installation on every supported web browser", () => {
  assert.equal(getInitialInstallState({ isIosSafari: true, isStandalone: true }), "installed");
  assert.equal(getInitialInstallState({ isIosSafari: true, isStandalone: false }), "installable");
  assert.equal(getInitialInstallState({ isIosSafari: false, isStandalone: false }), "installable");
  assert.equal(getInitialInstallMethod({ isIosSafari: true, isStandalone: false }), "ios-manual");
  assert.equal(getInitialInstallMethod({ isIosSafari: false, isStandalone: false }), "browser-manual");
  assert.equal(getInitialInstallMethod({ isIosSafari: false, isStandalone: true }), null);
});

test("manifest carries ANKT standalone identity and exact official icon sizes", () => {
  const manifest = JSON.parse(read("../../public/manifest.webmanifest"));
  assert.equal(manifest.name, "ANKT");
  assert.equal(manifest.short_name, "ANKT");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.orientation, "any");
  assert.deepEqual(
    manifest.icons.map(({ sizes }) => sizes),
    ["192x192", "512x512"],
  );
  for (const size of [192, 512]) {
    const png = readFileSync(
      new URL(`../../public/pwa-icon-${size}.png`, import.meta.url),
    );
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test("single worker keeps call notification click and adds safe PWA caching", () => {
  const worker = read("../../public/firebase-messaging-sw.js");
  assert.equal((worker.match(/notificationclick/g) ?? []).length, 1);
  assert.match(worker, /incoming-call\/\$\{encodeURIComponent\(callId\)\}/);
  assert.match(worker, /event\.notification\.close\(\)/);
  assert.match(worker, /SKIP_WAITING/);
  assert.match(worker, /request\.method !== "GET"/);
  assert.match(worker, /response\.clone\(\)/);
  assert.match(worker, /\/api\//);
  assert.match(worker, /\/hubs?\//);
});

test("worker serves the cached SPA shell offline and bypasses private API requests", async () => {
  const worker = read("../../public/firebase-messaging-sw.js");
  const handlers = new Map();
  const shell = new Response("cached ANKT shell", {
    headers: { "Content-Type": "text/html" },
  });
  const cache = {
    match: async (request) => (request === "/" ? shell.clone() : null),
    put: async () => undefined,
  };
  runInNewContext(worker, {
    URL,
    Response,
    caches: {
      keys: async () => [],
      open: async () => cache,
    },
    console,
    fetch: async () => {
      throw new TypeError("offline");
    },
    self: {
      addEventListener: (name, handler) => handlers.set(name, handler),
      clients: {},
      location: {
        href: "https://ankt.example/firebase-messaging-sw.js",
        origin: "https://ankt.example",
      },
      registration: {},
    },
  });

  let navigationResponse;
  handlers.get("fetch")({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://ankt.example/chat",
    },
    respondWith: (response) => {
      navigationResponse = response;
    },
  });
  assert.equal(await (await navigationResponse).text(), "cached ANKT shell");

  let apiIntercepted = false;
  handlers.get("fetch")({
    request: {
      method: "GET",
      mode: "cors",
      url: "https://ankt.example/api/profile",
    },
    respondWith: () => {
      apiIntercepted = true;
    },
  });
  assert.equal(apiIntercepted, false);
});

test("SPA template links install metadata without a hard-coded host", () => {
  const html = read("../../public/index.html");
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" href="\/pwa-icon-192\.png"/);
  assert.doesNotMatch(html, /http:\/\/localhost/i);
});

test("profile settings owns the install action and root owns status UI", () => {
  const settings = read("../../components/profile/profile-settings-sheet.tsx");
  const action = read("../../components/pwa/pwa-install-action.tsx");
  const root = read("../../app/_layout.tsx");
  assert.match(settings, /PwaInstallAction/);
  assert.match(action, /snapshot\.installMethod === "browser-manual"/);
  assert.match(action, /Mở menu trình duyệt/);
  assert.match(root, /PwaStatusHost/);
});

test("PWA updates defer reload for voice, group, and incoming call routes", () => {
  const service = read("../../services/pwa.service.web.ts");
  assert.match(service, /call\|group-call\|incoming-call/);
  assert.match(service, /isCallInProgress\(\)/);
  assert.match(service, /return "deferred"/);
});
