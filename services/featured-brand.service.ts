import { parseFeaturedBrands } from '@/types/featured-brand';

export async function getFeaturedBrands(signal?: AbortSignal) {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/featured-brands`, {
    headers: { Accept: 'application/json' }, cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error('Không thể tải thương hiệu.');
  return parseFeaturedBrands(await response.json());
}
