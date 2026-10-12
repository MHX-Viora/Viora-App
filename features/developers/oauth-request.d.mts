export type OAuthRequest = { clientId: string; redirectUri: string; state: string; nonce: string; codeChallenge: string; codeChallengeMethod: 'S256'; scopes: string[] };
export function parseOAuthRequest(params: Record<string, unknown>): OAuthRequest | null;
export function rememberOAuthRequest(params: Record<string, unknown>): void;
export function readOAuthRequest(): OAuthRequest | null;
export function clearOAuthRequest(): void;
