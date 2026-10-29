import type { Hashtag } from '@/types/reel';

export const normalizeHashtag = (value: string) => value.trim().replace(/^#+/, '').replace(/\s+/g, '').toLowerCase();
export const dedupeHashtags = (values: string[]) => Array.from(new Set(values.map(normalizeHashtag).filter(Boolean)));

export function mergePendingHashtags(selected: Hashtag[], query: string): Hashtag[] {
  const name = normalizeHashtag(query);
  const candidates = name ? [...selected, { id: `custom-${name}`, name, postCount: 0 }] : selected;
  const seen = new Set<string>();
  return candidates.flatMap(tag => {
    const normalized = normalizeHashtag(tag.name);
    if (!normalized || seen.has(normalized)) return [];
    seen.add(normalized);
    return [{ ...tag, name: normalized }];
  });
}
