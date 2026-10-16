import { isSsoTransaction } from "../features/sso/bootstrap";

type ReturnStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const key = "ankt.sso.pendingReturn";
function browserStorage(): ReturnStorage | undefined {
  try { return globalThis.sessionStorage; } catch { return undefined; }
}
export function rememberSsoReturn(transaction: string, storage = browserStorage()): void {
  if (!isSsoTransaction(transaction)) return;
  try { storage?.setItem(key, `/sso/login?transaction=${transaction}`); } catch { /* Storage may be unavailable. */ }
}
export function pendingSsoReturn(storage = browserStorage()): `/sso/login?transaction=${string}` | null {
  try {
    const value = storage?.getItem(key);
    if (value?.startsWith("/sso/login?transaction=") && isSsoTransaction(value.slice("/sso/login?transaction=".length))) return value as `/sso/login?transaction=${string}`;
    storage?.removeItem(key);
  } catch { /* Storage may be unavailable. */ }
  return null;
}
export function clearSsoReturn(storage = browserStorage()): void {
  try { storage?.removeItem(key); } catch { /* Storage may be unavailable. */ }
}
