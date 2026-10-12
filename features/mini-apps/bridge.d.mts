export function allowedNavigation(value: string, domains: string[]): boolean;
export function safeExternalUrl(value: string): string | undefined;
export class BridgeGuard {
  constructor(binding: { appId: string; sessionId: string; nonce: string; origins: string[]; source: unknown });
  active: boolean;
  close(): void;
  accept(message: unknown, origin: string, source: unknown): boolean;
}
