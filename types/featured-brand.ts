export type FeaturedBrand = { id: string; name: string; logoUrl: string; sortOrder: number };

export function parseFeaturedBrands(value: unknown): FeaturedBrand[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.filter((item): item is FeaturedBrand => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id)
      || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 160
      || typeof item.logoUrl !== 'string' || item.logoUrl.length > 2048 || !item.logoUrl.startsWith('https://') || /[\\\s\x00-\x1f]/.test(item.logoUrl)
      || !Number.isInteger(item.sortOrder) || item.sortOrder < 0 || item.sortOrder > 10000) return false;
    try { const url = new URL(item.logoUrl); if (url.username || url.password) return false; } catch { return false; }
    ids.add(item.id); return true;
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}
