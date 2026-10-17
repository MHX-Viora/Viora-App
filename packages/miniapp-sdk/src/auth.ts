import * as oidc from 'openid-client';
import {SdkError, validateOptions, type SdkOptions} from './config.js';

export type TransactionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
interface Transaction {
  issuer: string; clientId: string; redirectUri: string;
  verifier: string; state: string; nonce: string; createdAt: number;
}
type Tokens = Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>;

export class MiniAppSdk {
  readonly #options;
  readonly #storage?: TransactionStorage;
  readonly #key: string;
  #configuration?: Promise<oidc.Configuration>;
  #tokens?: Tokens;
  #expiresAt = 0;
  #epoch = 0;

  constructor(options: SdkOptions, storage?: TransactionStorage) {
    this.#options = validateOptions(options); this.#storage = storage;
    this.#key = `ankt.oidc:${this.#options.issuer}:${this.#options.clientId}:${this.#options.redirectUri}`;
  }

  async initialize(): Promise<void> { await this.#ready(); }

  readonly auth = {
    login: async (options: {prompt?: 'none' | 'consent'; navigate?: boolean} = {}): Promise<URL> => {
      const epoch = ++this.#epoch;
      if (options.prompt !== undefined && options.prompt !== 'none' && options.prompt !== 'consent') throw new SdkError('INVALID_CONFIG');
      const config = await this.#ready();
      const verifier = oidc.randomPKCECodeVerifier();
      const transaction: Transaction = {...this.#options, verifier, state: oidc.randomState(), nonce: oidc.randomNonce(), createdAt: Date.now()};
      const url = oidc.buildAuthorizationUrl(config, {
        redirect_uri: this.#options.redirectUri, scope: this.#options.scope,
        state: transaction.state, nonce: transaction.nonce,
        code_challenge_method: 'S256', code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
        ...(options.prompt ? {prompt: options.prompt} : {}),
      });
      if (epoch !== this.#epoch) throw new SdkError('INVALID_TRANSACTION');
      this.#store(store => store.setItem(this.#key, JSON.stringify(transaction)));
      if (options.navigate !== false) {
        if (typeof window === 'undefined' || window.top !== window.self) {
          this.#store(store => store.removeItem(this.#key)); throw new SdkError('UNSUPPORTED_CONTEXT');
        }
        window.location.assign(url.href);
      }
      return url;
    },

    handleRedirect: async (callback: URL | string): Promise<void> => {
      const epoch = ++this.#epoch;
      this.#tokens = undefined;
      const raw = this.#store(store => {const value = store.getItem(this.#key); store.removeItem(this.#key); return value;});
      let transaction: Transaction; let url: URL;
      try {
        if (!raw || raw.length > 4096) throw new Error();
        transaction = JSON.parse(raw) as Transaction; url = new URL(callback);
        const redirect = new URL(this.#options.redirectUri);
        if (!transaction || transaction.issuer !== this.#options.issuer || transaction.clientId !== this.#options.clientId ||
          transaction.redirectUri !== this.#options.redirectUri || !Number.isFinite(transaction.createdAt) ||
          Date.now() - transaction.createdAt > 300000 || transaction.createdAt > Date.now() + 1000 ||
          [transaction.verifier, transaction.state, transaction.nonce].some(value => typeof value !== 'string' || value.length < 32 || value.length > 128) ||
          url.origin !== redirect.origin || url.pathname !== redirect.pathname || url.hash || url.username || url.password) throw new Error();
      } catch { throw new SdkError('INVALID_TRANSACTION'); }
      try {
        const tokens = await oidc.authorizationCodeGrant(await this.#ready(), url, {
          pkceCodeVerifier: transaction.verifier, expectedState: transaction.state, expectedNonce: transaction.nonce, idTokenExpected: true,
        });
        if (epoch !== this.#epoch) throw new SdkError('INVALID_TRANSACTION');
        const claims = tokens.claims();
        if (!claims?.sub || !Number.isFinite(tokens.expires_in) || tokens.expires_in! <= 0 || tokens.expires_in! > 300 || tokens.refresh_token) throw new Error();
        this.#tokens = tokens; this.#expiresAt = Date.now() + tokens.expires_in! * 1000;
      } catch (error) {
        if (error instanceof SdkError) throw error;
        throw new SdkError('OIDC_FAILED');
      }
    },

    getStatus: (): 'authenticated' | 'unauthenticated' => {
      if (Date.now() >= this.#expiresAt) this.#tokens = undefined;
      return this.#tokens ? 'authenticated' : 'unauthenticated';
    },

    getUser: async (): Promise<oidc.UserInfoResponse> => {
      if (this.auth.getStatus() !== 'authenticated' || !this.#tokens) throw new SdkError('NOT_AUTHENTICATED');
      const epoch = this.#epoch; const tokens = this.#tokens;
      try {
        const user = await oidc.fetchUserInfo(await this.#ready(), tokens.access_token, tokens.claims()!.sub);
        if (epoch !== this.#epoch) throw new SdkError('NOT_AUTHENTICATED');
        return user;
      } catch (error) {
        if (epoch === this.#epoch) this.#tokens = undefined;
        if (error instanceof SdkError) throw error;
        throw new SdkError('OIDC_FAILED');
      }
    },

    logout: (): void => {
      ++this.#epoch; this.#tokens = undefined; this.#expiresAt = 0;
      this.#store(store => store.removeItem(this.#key));
    },
  };

  #store<T>(action: (storage: TransactionStorage) => T): T {
    try {
      const storage = this.#storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
      if (!storage) throw new Error();
      return action(storage);
    } catch { throw new SdkError('STORAGE_UNAVAILABLE'); }
  }

  #ready(): Promise<oidc.Configuration> {
    if (!this.#configuration) {
      const issuer = new URL(this.#options.issuer);
      this.#configuration = oidc.discovery(issuer, this.#options.clientId, {
        redirect_uris: [this.#options.redirectUri], token_endpoint_auth_method: 'none', id_token_signed_response_alg: 'RS256',
      }, oidc.None(), {
        timeout: this.#options.timeoutMs / 1000,
        execute: [oidc.enableNonRepudiationChecks],
        [oidc.customFetch]: (url, init) => {
          const target = new URL(url);
          if (target.protocol !== 'https:' || target.origin !== issuer.origin || target.username || target.password) throw new SdkError('OIDC_FAILED');
          const body = init.body instanceof Uint8Array ? new Uint8Array(init.body).buffer : init.body;
          return fetch(url, {...init, body, credentials: 'omit', redirect: 'error'});
        },
      }).then(config => {
        const metadata = config.serverMetadata();
        for (const key of ['authorization_endpoint','token_endpoint','userinfo_endpoint','jwks_uri'] as const) {
          const endpoint = new URL(metadata[key] ?? '');
          if (endpoint.protocol !== 'https:' || endpoint.origin !== issuer.origin || endpoint.username || endpoint.password || endpoint.hash) throw new Error();
        }
        if (!metadata.code_challenge_methods_supported?.includes('S256')) throw new Error();
        return config;
      }).catch(() => {this.#configuration = undefined; throw new SdkError('OIDC_FAILED');});
    }
    return this.#configuration;
  }
}

export const createMiniAppSdk = (options: SdkOptions, storage?: TransactionStorage) => new MiniAppSdk(options, storage);
