import type { DocBlock, DocPage, DocSection } from '../lib/content-schema';
export const paragraph = (text: string): DocBlock => ({ type: 'paragraph', text });
export const list = (...items: string[]): DocBlock => ({ type: 'list', items });
export const steps = (...items: string[]): DocBlock => ({ type: 'list', items, ordered: true });
export const note = (title: string, text: string): DocBlock => ({ type: 'callout', title, text });
export const link = (text: string, slug: string): DocBlock => ({ type: 'link', text, href: slug.startsWith('/developers') ? slug : `/developers/docs/${slug}` });
export const section = (id: string, title: string, ...blocks: DocBlock[]): DocSection => ({ id, title, blocks });
export function page(slug: string, title: string, description: string, group: string, order: number, sections: DocSection[], related: string[] = []): DocPage {
  return { slug, title, description, group, order, revision: 2, updatedAt: '2026-10-27', status: 'implemented-but-unverified', sections, related };
}
