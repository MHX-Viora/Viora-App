export const VERSION = '0.1.0';
export type SdkErrorCode = 'INVALID_CONFIG' | 'OIDC_FAILED' | 'STORAGE_UNAVAILABLE' | 'INVALID_TRANSACTION' | 'NOT_AUTHENTICATED' | 'UNSUPPORTED_CONTEXT' |
  'UNSUPPORTED_METHOD' | 'BRIDGE_DISPOSED' | 'BRIDGE_TIMEOUT' | 'BRIDGE_PROTOCOL' | 'BRIDGE_BUSY';
export class SdkError extends Error {
  constructor(public readonly code: SdkErrorCode) { super(`ANKT SDK: ${code}`); this.name = 'SdkError'; }
}
export interface SdkOptions {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  timeoutMs?: number;
}
export function validateOptions(options: SdkOptions) {
  const invalid = () => { throw new SdkError('INVALID_CONFIG'); };
  if (!options || typeof options !== 'object' || Object.keys(options).some(key => !['issuer','clientId','redirectUri','scope','timeoutMs'].includes(key))) return invalid();
  const url = (value: string) => {
    try {
      const result = new URL(value);
      if (result.protocol !== 'https:' || result.username || result.password || result.search || result.hash) return invalid();
      return result;
    } catch { return invalid(); }
  };
  const issuer = url(options.issuer); const redirectUri = url(options.redirectUri);
  if (typeof options.clientId !== 'string' || !options.clientId.trim() || options.clientId.length > 256 || /\s/.test(options.clientId)) return invalid();
  const scope = options.scope ?? 'openid profile';
  if (typeof scope !== 'string' || !scope.split(' ').includes('openid') || scope.split(' ').some(s => !['openid','profile','email'].includes(s))) return invalid();
  const timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000) return invalid();
  return Object.freeze({issuer: issuer.href, clientId: options.clientId, redirectUri: redirectUri.href, scope, timeoutMs});
}
