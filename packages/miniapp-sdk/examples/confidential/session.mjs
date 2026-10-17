import {randomBytes, createHash} from 'node:crypto';

// Demonstration storage: restart loses all sessions. Use a transactional shared
// store with equivalent expiry/one-use semantics before running multiple replicas.
export class PrivateStore {
  #values = new Map();
  constructor(capacity = 1000, clock = Date.now) { this.capacity = capacity; this.clock = clock; }
  #hash(key) { return createHash('sha256').update(key).digest('hex'); }
  #prune() { for (const [key, item] of this.#values) if (item.expires <= this.clock()) this.#values.delete(key); }
  put(value, lifetime) {
    this.#prune();
    if (this.#values.size >= this.capacity) throw new Error('Session capacity exceeded');
    const key = randomBytes(32).toString('base64url');
    this.#values.set(this.#hash(key), {value, expires: this.clock() + lifetime}); return key;
  }
  get(key) { this.#prune(); return typeof key === 'string' ? this.#values.get(this.#hash(key))?.value : undefined; }
  claim(key) {
    this.#prune(); const item = typeof key === 'string' ? this.#values.get(this.#hash(key)) : undefined;
    if (!item || item.claimed) return undefined;
    item.claimed = true; return item.value;
  }
  take(key) { const value = this.get(key); this.remove(key); return value; }
  remove(key) { if (typeof key === 'string') this.#values.delete(this.#hash(key)); }
}
export function readCookie(header = '', name) {
  const matches = header.split(';').map(part => part.trim()).filter(part => part.startsWith(name + '='));
  const value = matches[0]?.slice(name.length + 1);
  return matches.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
export function cookie(name, value, seconds) {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`;
}
