export function allowedNavigation(value, domains) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && domains.includes(url.hostname); } catch { return false; }
}
export function safeExternalUrl(value) {
  try { const url = new URL(value); return typeof value === 'string' && value.length <= 2048 && url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
const methods = new Set(['getPlatformInfo', 'getAppInfo', 'requestOAuthLogin', 'getGrantedPermissions', 'requestPermission', 'closeMiniApp', 'reportSsoStatus', 'openExternalUrl']);
export class BridgeGuard {
  constructor(binding) { this.binding = binding; this.seen = new Set(); this.times = []; this.active = true; }
  close() { this.active = false; this.seen.clear(); }
  accept(message, origin, source) {
    const b = this.binding;
    let size; try { size = JSON.stringify(message)?.length ?? 0; } catch { return false; }
    if (!this.active || !b.origins.includes(origin) || b.source !== source || !message || typeof message !== 'object' ||
        size > 16384 || message.type !== 'ANKT_MINI_APP_REQUEST' || message.appId !== b.appId || message.sessionId !== b.sessionId || message.nonce !== b.nonce ||
        typeof message.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(message.id) || this.seen.has(message.id) || !methods.has(message.method) || !message.params || Array.isArray(message.params) || typeof message.params !== 'object') return false;
    const now = Date.now(); this.times = this.times.filter(time => now - time < 60000);
    if (this.times.length >= 30 || this.seen.size >= 900) return false;
    this.times.push(now); this.seen.add(message.id); return true;
  }
}
