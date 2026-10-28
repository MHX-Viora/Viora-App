export type SupportStatus = 'implemented-and-verified' | 'implemented-but-unverified' | 'planned' | 'unsupported' | 'deprecated';
export type CodeLanguage = 'typescript' | 'javascript' | 'html' | 'csharp' | 'bash' | 'json' | 'http';
export type DocBlock = { type: 'paragraph'; text: string } | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'callout'; title: string; text: string; tone?: 'info' | 'warning' }
  | { type: 'code'; language: CodeLanguage; code: string; caption?: string }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'link'; text: string; href: string };
export type DocSection = { id: string; title: string; level?: 2 | 3; blocks: DocBlock[] };
export type DocPage = { slug: string; title: string; description: string; group: string; order: number;
  revision: number; updatedAt: string; status: SupportStatus; sdkVersion?: string; sections: DocSection[]; related: string[] };
export const DOCS_BASE = '/developers/docs';
const statuses = new Set<SupportStatus>(['implemented-and-verified', 'implemented-but-unverified', 'planned', 'unsupported', 'deprecated']);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function headingId(_slug: string, id: string) { return id; }
export function documentUrl(slug = '', anchor?: string) {
  if ((slug && !slugPattern.test(slug)) || (anchor && !slugPattern.test(anchor))) throw Error('Invalid documentation URL');
  return `${DOCS_BASE}${slug ? `/${slug}` : ''}${anchor ? `#${anchor}` : ''}`;
}
export function safeLink(href: string) {
  return /^\/developers(?:\/[^\s\\]*)?$/.test(href) || /^#[a-z0-9-]+$/.test(href) ||
    /^https:\/\//.test(href) && (() => { try { const url = new URL(href); return !url.username && !url.password; } catch { return false; } })();
}
export function validateDocuments(pages: readonly DocPage[]) {
  const slugs = new Set<string>();
  for (const page of pages) {
    if ((page.slug && !slugPattern.test(page.slug)) || slugs.has(page.slug) || !page.title || !page.description ||
      !statuses.has(page.status) || !Number.isInteger(page.revision) || page.revision < 1 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(page.updatedAt) || !page.sections.length) throw Error(`Invalid document: ${page.slug}`);
    slugs.add(page.slug);
    const ids = new Set<string>();
    for (const section of page.sections) {
      if (!slugPattern.test(section.id) || ids.has(section.id) || !section.title || section.level && ![2, 3].includes(section.level)) throw Error(`Invalid heading: ${page.slug}`);
      ids.add(section.id);
      for (const block of section.blocks) {
        if (!['paragraph', 'list', 'callout', 'code', 'table', 'link'].includes(block.type)) throw Error('Unsupported content');
        if (block.type === 'link' && !safeLink(block.href)) throw Error('Unsafe content link');
        if (block.type === 'code' && !['typescript', 'javascript', 'html', 'csharp', 'bash', 'json', 'http'].includes(block.language)) throw Error('Unsupported language');
        if (block.type === 'code' && typeof block.code !== 'string') throw Error('Missing code example');
        if (block.type === 'table' && block.rows.some(row => row.length !== block.columns.length)) throw Error('Invalid table');
      }
    }
  }
  for (const page of pages) {
    for (const related of page.related) if (!slugs.has(related)) throw Error(`Missing related document: ${related}`);
    for (const section of page.sections) for (const block of section.blocks) if (block.type === 'link' && block.href.startsWith(DOCS_BASE)) {
      const url = new URL(block.href, 'https://docs.invalid'), slug = url.pathname.slice(DOCS_BASE.length).replace(/^\//, '');
      const target = pages.find(candidate => candidate.slug === slug);
      if (!target || url.hash && !target.sections.some(heading => heading.id === url.hash.slice(1))) throw Error(`Broken documentation link: ${block.href}`);
    }
  }
}
