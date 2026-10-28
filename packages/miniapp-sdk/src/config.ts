export const VERSION = '0.4.1';
export type SdkErrorCode = 'INVALID_CONFIG' | 'UNSUPPORTED_CONTEXT' | 'UNSUPPORTED_METHOD' | 'BRIDGE_DISPOSED' | 'BRIDGE_TIMEOUT' | 'BRIDGE_PROTOCOL' | 'BRIDGE_BUSY' | 'BRIDGE_FORBIDDEN';
export class SdkError extends Error {
  constructor(public readonly code: SdkErrorCode) { super(`ANKT SDK: ${code}`); this.name = 'SdkError'; }
}
