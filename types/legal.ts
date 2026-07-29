export enum LegalDocumentType {
  TermsOfService = 0,
  PrivacyPolicy = 1,
  PermissionPolicy = 2,
  CommunityGuidelines = 3,
  Other = 4,
}
export type LegalDocumentSummary = { id: string; type: LegalDocumentType; title: string; summary: string | null; languageCode: string; version: string; publishedAt: string | null };
export type LegalDocument = LegalDocumentSummary & { content: string; updatedAt: string };
