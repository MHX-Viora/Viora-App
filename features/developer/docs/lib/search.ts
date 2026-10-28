import type { DocPage, DocBlock } from './content-schema';
import { documentUrl } from './content-schema';
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
export function blockText(block: DocBlock): string {
  switch (block.type) {
    case 'paragraph': case 'link': return block.text;
    case 'callout': return `${block.title} ${block.text}`;
    case 'code': return block.code;
    case 'list': return block.items.join(' ');
    case 'table': return [...block.columns, ...block.rows.flat()].join(' ');
  }
}
export function highlightText(value: string, term: string) {
  const text = value.normalize('NFC'), query = fold(term.trim());
  const start = query ? fold(text).indexOf(query) : -1;
  if (start < 0) return [{ text, match: false }];
  return [{ text: text.slice(0, start), match: false }, { text: text.slice(start, start + query.length), match: true }, { text: text.slice(start + query.length), match: false }];
}
export function searchDocuments(pages: readonly DocPage[], input: string) {
  const query = fold(input.trim());
  if (!query || query.length > 128) return [];
  const terms = query.split(/\s+/);
  return pages.flatMap(page => {
    const sections = page.sections.map(section => ({ ...section, text: section.blocks.map(blockText).join(' ') }));
    const haystack = fold([page.title, page.description, ...sections.map(section => section.title + ' ' + section.text)].join(' '));
    if (!terms.every(term => haystack.includes(term))) return [];
    const target = sections.find(section => fold(section.title + ' ' + section.text).includes(query));
    const score = (fold(page.title).includes(query) ? 10 : 0) + (target && fold(target.title).includes(query) ? 5 : 0);
    const text = target?.text || page.description, position = fold(text).indexOf(query);
    const excerpt = text.slice(Math.max(0, position - 40), Math.max(0, position - 40) + 180);
    return [{ slug: page.slug, title: page.title, heading: target?.title, excerpt, href: documentUrl(page.slug, target?.id), score }];
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'vi')).slice(0, 8);
}
