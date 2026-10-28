import { parseUtilityBanners } from '@/types/utility-banner';

export async function getUtilityBanners(signal?: AbortSignal) {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/utility-banners`, {
    headers: { Accept: 'application/json' }, cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error('Không thể tải banner.');
  return parseUtilityBanners(await response.json());
}
