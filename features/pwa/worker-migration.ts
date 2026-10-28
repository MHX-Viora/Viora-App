type MigratingWorker = Pick<ServiceWorker, 'scriptURL' | 'postMessage'> & Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & { state: string };
type MigratingRegistration = Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & { waiting: MigratingWorker | null; installing: MigratingWorker | null };

export function isLegacyWorker(script: string | undefined, origin: string): boolean {
  if (!script) return false;
  try { const url = new URL(script); return url.origin === origin && url.pathname === '/sw.js'; }
  catch { return false; }
}

// Only retire the old /sw.js controller. Normal Firebase worker updates still
// follow the existing user-controlled update/call policy. No storage is erased.
export function activateLegacyWorkerReplacement(registration: MigratingRegistration, controllerScript: string | undefined, origin: string): boolean {
  if (!isLegacyWorker(controllerScript, origin)) return false;
  let completed = false;
  const found = () => watch(registration.installing);
  function watch(worker: MigratingWorker | null) {
    if (!worker || completed) return;
    const url = new URL(worker.scriptURL);
    if (url.origin !== origin || url.pathname !== '/firebase-messaging-sw.js') return;
    const changed = () => {
      if (completed || worker.state === 'redundant') { worker.removeEventListener('statechange', changed); return; }
      if (worker.state !== 'installed') return;
      completed = true;
      registration.removeEventListener('updatefound', found);
      worker.removeEventListener('statechange', changed);
      worker.postMessage({ type: 'SKIP_WAITING' });
    };
    worker.addEventListener('statechange', changed);
    changed();
  }
  registration.addEventListener('updatefound', found);
  watch(registration.waiting);
  watch(registration.installing);
  return true;
}
