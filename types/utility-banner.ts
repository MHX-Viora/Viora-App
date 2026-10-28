export type UtilityBanner = { id: string; imageUrl: string; targetUrl: string | null };

export function safeBannerTarget(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048 || /[\\\x00-\x20]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('%')) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

export function parseUtilityBanners(value: unknown): UtilityBanner[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.filter((item): item is UtilityBanner => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || ids.has(item.id)
      || typeof item.imageUrl !== 'string' || !item.imageUrl.startsWith('https://') || !safeBannerTarget(item.imageUrl)
      || (item.targetUrl !== null && !safeBannerTarget(item.targetUrl))) return false;
    ids.add(item.id); return true;
  }).slice(0, 20);
}
