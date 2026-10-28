import { introduction } from '../content/introduction';
import { startPages } from '../content/getting-started';
import { integrationPages } from '../content/integration-guides';
import { environmentPages } from '../content/environment-setup';
import { sdkPages } from '../content/sdk-guides';
import { lifecyclePages } from '../content/lifecycle-guides';
import { supportPages } from '../content/support-guides';
import { validateDocuments, type DocPage } from './content-schema';
export const pages: readonly DocPage[] = [...startPages, introduction, ...integrationPages, ...environmentPages, ...sdkPages, ...lifecyclePages, ...supportPages].sort((a, b) => a.order - b.order);
export function findPage(slug: string) { return pages.find(page => page.slug === slug); }
validateDocuments(pages);
