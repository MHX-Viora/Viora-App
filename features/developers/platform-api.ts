import { platformRequest } from '../mini-apps/api';
import type { AppAnalytics, AppVersion, CreatedMiniApp, DeveloperInput, DeveloperProfile, HybridApp, HybridConfig, TeamMember, VerifiedDomain } from './mini-app';
import type { DeveloperTerms, EmailVerificationChallenge, TechnicalTest } from './developer-platform';
const root = '/api/developer'; const app = (id: string) => `${root}/mini-apps/${encodeURIComponent(id)}`;
export const developerApi = {
  profile: () => platformRequest<DeveloperProfile>(`${root}/profile`),
  terms: () => platformRequest<DeveloperTerms>(`${root}/terms`),
  draft: (input: DeveloperInput) => platformRequest<DeveloperProfile>(`${root}/application/draft`, 'POST', input),
  submitProfile: (version: number, termsVersion: string) => platformRequest<DeveloperProfile>(`${root}/application/submit`, 'POST', { version, termsVersion, acceptedTerms: true }),
  requestEmail: (email: string) => platformRequest<EmailVerificationChallenge>(`${root}/email-verification/request`, 'POST', { email }),
  confirmEmail: (verificationId: string, code: string) => platformRequest(`${root}/email-verification/confirm`, 'POST', { verificationId, code }),
  apps: () => platformRequest<HybridApp[]>(`${root}/mini-apps`),
  app: (id: string) => platformRequest<HybridApp>(app(id)),
  create: (input: HybridConfig) => platformRequest<CreatedMiniApp>(`${root}/mini-apps`, 'POST', input),
  update: (id: string, input: HybridConfig, proof?: string) => platformRequest<void>(app(id), 'PUT', input, undefined, proof ? { 'X-Developer-Reauth': proof } : undefined),
  submit: (id: string) => platformRequest<void>(`${app(id)}/submit-review`, 'POST'),
  publish: (id: string, version: number) => platformRequest<void>(`${app(id)}/publish`, 'POST', { version }),
  unpublish: (id: string) => platformRequest<void>(`${app(id)}/unpublish`, 'POST'),
  test: (id: string) => platformRequest<TechnicalTest>(`${app(id)}/technical-test`, 'POST'),
  domains: (id: string) => platformRequest<VerifiedDomain[]>(`${app(id)}/domains`),
  addDomain: (id: string, host: string, proof: string) => platformRequest(`${app(id)}/domains`, 'POST', { host }, undefined, { 'X-Developer-Reauth': proof }),
  verifyDomain: (id: string, domainId: string) => platformRequest(`${app(id)}/domains/${encodeURIComponent(domainId)}/verify`, 'POST'),
  versions: (id: string) => platformRequest<AppVersion[]>(`${app(id)}/versions`),
  analytics: (id: string) => platformRequest<AppAnalytics>(`${app(id)}/analytics`),
  rotate: (id: string, proof: string) => platformRequest<CreatedMiniApp>(`${app(id)}/rotate-secret`, 'POST', undefined, undefined, { 'X-Developer-Reauth': proof }),
  reauth: (password: string, operation: string, miniAppId?: string) => platformRequest<{ proof: string }>(`${root}/reauth`, 'POST', { password, operation, miniAppId }),
  team: () => platformRequest<TeamMember[]>(`${root}/team`),
  addMember: (accountId: string, role: string, proof: string) => platformRequest(`${root}/team`, 'POST', { accountId, role }, undefined, { 'X-Developer-Reauth': proof }),
  role: (id: string, role: string, proof: string) => platformRequest(`${root}/team/${encodeURIComponent(id)}`, 'PUT', { role }, undefined, { 'X-Developer-Reauth': proof }),
  removeMember: (id: string, proof: string) => platformRequest(`${root}/team/${encodeURIComponent(id)}`, 'DELETE', undefined, undefined, { 'X-Developer-Reauth': proof }),
};
