export type MiniApp = { id: string; name: string; slug: string; description?: string; iconUrl?: string; coverUrl?: string; developer: string; categoryId?: string; category?: string; publishedVersion: number; authenticationMode: string; autoLogin: boolean };
export type Category = { id: string; name: string; icon: string; sortOrder: number };
export type CatalogPage = { items: MiniApp[]; total: number; page: number; pageSize: number; favoriteIds: string[] };
export type Permission = { code: string; name: string; description?: string; isSensitive: boolean };
export type AppDetail = MiniApp & { permissions: Permission[]; status: string; webUrl: string; allowedDomains: string[]; allowedOrigins: string[]; callbackUrls: string[]; clientId: string; screenshots?: string[]; privacyPolicyUrl?: string; termsUrl?: string; supportEmail?: string; publishedAt?: string; ssoMode?: string };
export type Launch = { launchUrl: string; sessionId: string; sessionToken: string; allowedDomains: string[]; expiresIn: number };
export type Banner = { id: string; title: string; imageUrl: string; miniAppId?: string; categoryId?: string };
export type Rail = 'all' | 'favorites' | 'recent' | 'featured' | 'popular' | 'new' | 'recommended';
