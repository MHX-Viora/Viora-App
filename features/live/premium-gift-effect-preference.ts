import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "live:reduce-gift-effects";
let reduced = false;
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function hydrateReducedGiftEffects() {
  if (loaded) return Promise.resolve();
  if (!loading) loading = AsyncStorage.getItem(STORAGE_KEY)
    .then((value) => {
      if (!loaded && value === "1") { reduced = true; notify(); }
    })
    .catch(() => undefined)
    .finally(() => { loaded = true; loading = null; });
  return loading;
}

export function useReducedGiftEffects() {
  useEffect(() => { void hydrateReducedGiftEffects(); }, []);
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => reduced,
    () => false,
  );
}

export function setReducedGiftEffects(value: boolean) {
  reduced = value;
  loaded = true;
  notify();
  void AsyncStorage.setItem(STORAGE_KEY, value ? "1" : "0").catch(() => undefined);
}
