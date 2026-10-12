export interface DocSection { id: string; title: string; paragraphs: string[]; items: string[]; code: string }
export interface DocPage { slug: string; path: string; title: string; description: string; keywords: string; sections: DocSection[] }
export const pages: DocPage[];
export const revision: string;
export function fold(value: string): string;
export function searchDocs(query: string): (DocPage & { score: number })[];
