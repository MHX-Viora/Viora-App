const SHELL_CACHE = "ankt-shell-v1";
const STATIC_CACHE = "ankt-static-v1";
const CURRENT_CACHES = new Set([SHELL_CACHE, STATIC_CACHE]);
const SHELL_FILES = [
  "/",
  "/manifest.webmanifest",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/favicon.ico",
];
const SENSITIVE_PATH_PREFIXES = [
  "/api/",
  "/auth/",
  "/login",
  "/refresh",
  "/hub/",
  "/hubs/",
  "/signalr/",
];

const canCacheResponse = (response) =>
  response.ok &&
  response.type !== "opaque" &&
  !response.headers.get("Cache-Control")?.includes("no-store");

const isSensitivePath = (pathname) =>
  SENSITIVE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isStaticPath = (pathname) =>
  pathname.startsWith("/_expo/static/") ||
  pathname.startsWith("/assets/") ||
  SHELL_FILES.includes(pathname);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        SHELL_FILES.map(async (path) => {
          try {
            const response = await fetch(path, { cache: "reload" });
            if (canCacheResponse(response)) await cache.put(path, response.clone());
          } catch {
            // A partial precache must not prevent push/call worker installation.
          }
        }),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith("ankt-") && !CURRENT_CACHES.has(name))
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

const networkFirstNavigation = async (request) => {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (canCacheResponse(response)) await cache.put("/", response.clone());
    return response;
  } catch {
    return (await cache.match("/")) || Response.error();
  }
};

const cacheFirstStatic = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (canCacheResponse(response)) await cache.put(request, response.clone());
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isSensitivePath(url.pathname)) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (isStaticPath(url.pathname)) event.respondWith(cacheFirstStatic(request));
});

const CALL_LIFECYCLE_TYPES = new Set([
  "CallRejected",
  "CallCancelled",
  "CallEnded",
  "CallMissed",
  "CallTimeout",
  "CallAnsweredElsewhere",
]);

const notificationTag = (callId) => `incoming-call-${callId}`;

// Register click handling before Firebase so ANKT owns call navigation.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const callId = event.notification.data?.callId;
  if (!callId) return;
  const target = new URL(`/incoming-call/${encodeURIComponent(callId)}`, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const existing = clients[0];
      if (existing) {
        await existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

const config = Object.fromEntries(new URL(self.location.href).searchParams.entries());
const hasFirebaseConfig =
  config.apiKey && config.appId && config.messagingSenderId && config.projectId;

if (hasFirebaseConfig) {
  try {
    importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data ?? {};
  const type = data.type ?? "";
  const callId = data.callId ?? "";
  if (!callId) return;

  if (CALL_LIFECYCLE_TYPES.has(type)) {
    return self.registration.getNotifications({ tag: notificationTag(callId) })
      .then((items) => items.forEach((item) => item.close()));
  }
  if (type !== "IncomingCall") return;

  const callerName = data.callerDisplayName || data.title || "Người dùng ANKT";
  return self.registration.showNotification("ANKT", {
    body: `${callerName} đang gọi cho bạn`,
    data: { callId },
    icon: "/favicon.ico",
    requireInteraction: true,
    tag: notificationTag(callId),
  });
});
  } catch (error) {
    console.info("[Push] Firebase messaging worker unavailable", error);
  }
}
