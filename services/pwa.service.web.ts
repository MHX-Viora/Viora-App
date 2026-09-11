import {
  getInitialInstallMethod,
  getInitialInstallState,
  isIosSafariInstallCandidate,
  isStandaloneDisplay,
  type PwaInstallResult,
  type PwaSnapshot,
  type PwaUpdateResult,
} from "@/features/pwa/install-policy";
import { getActiveVoiceCall } from "@/features/calls/call-events";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type FirebaseWorkerOptions = object;

const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let reloadOnControllerChange = false;

const standaloneMedia = () => window.matchMedia("(display-mode: standalone)");
const navigatorStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isStandalone = () =>
  isStandaloneDisplay(standaloneMedia().matches, navigatorStandalone());
const isIosSafari = () =>
  isIosSafariInstallCandidate(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
  );
const isCallRoute = () =>
  /^\/(?:call|group-call|incoming-call)\//.test(window.location.pathname);
const isCallInProgress = () => Boolean(getActiveVoiceCall()) || isCallRoute();

let snapshot: PwaSnapshot = {
  installMethod: null,
  installState: "unavailable",
  isOnline: true,
  updateAvailable: false,
};

const emit = (next: Partial<PwaSnapshot>) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
};

const firebaseWorkerOptions = (): FirebaseWorkerOptions => ({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_WEB_API_KEY?.trim(),
  appId: process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID?.trim(),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN?.trim(),
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_WEB_MESSAGING_SENDER_ID?.trim(),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID?.trim(),
});

const workerUrl = (options: FirebaseWorkerOptions) => {
  const url = new URL("/firebase-messaging-sw.js", window.location.origin);
  Object.entries(options).forEach(([key, value]) => {
    if (typeof value === "string" && value) url.searchParams.set(key, value);
  });
  return url;
};

const watchWorkerUpdates = (registration: ServiceWorkerRegistration) => {
  if (registration.waiting && navigator.serviceWorker.controller) {
    emit({ updateAvailable: true });
  }
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        emit({ updateAvailable: true });
      }
    });
  });
};

export const registerAnktServiceWorker = (
  options: FirebaseWorkerOptions = firebaseWorkerOptions(),
) => {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null);
  if (registrationPromise) return registrationPromise;
  registrationPromise = navigator.serviceWorker
    .register(workerUrl(options), { scope: "/" })
    .then((registration) => {
      watchWorkerUpdates(registration);
      return registration;
    })
    .catch((error: unknown) => {
      console.info(
        "[PWA] service worker registration unavailable",
        error instanceof Error ? error.message : String(error),
      );
      registrationPromise = null;
      return null;
    });
  return registrationPromise;
};

export const getPwaSnapshot = () => snapshot;

export const subscribePwa = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const initializePwa = () => {
  if (initialized) return;
  initialized = true;
  const initialStandalone = isStandalone();
  const initialIosSafari = isIosSafari();
  emit({
    installMethod: getInitialInstallMethod({
      isIosSafari: initialIosSafari,
      isStandalone: initialStandalone,
    }),
    installState: getInitialInstallState({
      isIosSafari: initialIosSafari,
      isStandalone: initialStandalone,
    }),
    isOnline: navigator.onLine,
  });

  window.addEventListener("beforeinstallprompt", (rawEvent) => {
    const event = rawEvent as BeforeInstallPromptEvent;
    event.preventDefault();
    deferredPrompt = event;
    emit({ installMethod: "prompt", installState: "installable" });
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit({ installMethod: null, installState: "installed" });
  });
  window.addEventListener("online", () => emit({ isOnline: true }));
  window.addEventListener("offline", () => emit({ isOnline: false }));
  standaloneMedia().addEventListener("change", () => {
    if (isStandalone()) {
      deferredPrompt = null;
      emit({ installMethod: null, installState: "installed" });
    }
  });
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (!reloadOnControllerChange) return;
    if (isCallInProgress()) {
      emit({ updateAvailable: true });
      return;
    }
    reloadOnControllerChange = false;
    window.location.reload();
  });
  void registerAnktServiceWorker();
};

export const requestPwaInstall = async (): Promise<PwaInstallResult> => {
  if (snapshot.installState !== "installable") return "unavailable";
  if (
    snapshot.installMethod === "ios-manual" ||
    snapshot.installMethod === "browser-manual"
  ) {
    return "manual";
  }
  const prompt = deferredPrompt;
  if (!prompt) return "unavailable";

  emit({ installState: "installing" });
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  deferredPrompt = null;
  emit({
    installMethod: outcome === "accepted" ? null : "browser-manual",
    installState: outcome === "accepted" ? "installed" : "installable",
  });
  return outcome;
};

export const applyPwaUpdate = async (): Promise<PwaUpdateResult> => {
  if (isCallInProgress()) return "deferred";
  if (reloadOnControllerChange) {
    reloadOnControllerChange = false;
    window.location.reload();
    return "applied";
  }
  const registration = await registerAnktServiceWorker();
  if (!registration?.waiting) return "unavailable";
  reloadOnControllerChange = true;
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
  emit({ updateAvailable: false });
  return "applied";
};
