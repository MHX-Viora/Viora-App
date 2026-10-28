import type { FeedPost } from '@/types/feed';
import type { AdvertisementCtaType } from '@/types/advertisement';

export function createPostAdvertisementPreview(post: FeedPost, ctaType: AdvertisementCtaType, destinationUrl: string, headline = '', description = ''): FeedPost {
  return { ...post, advertisement: { id: `preview:${post.id}`, ctaType, destinationUrl: destinationUrl.trim() || null, headline: headline.trim() || null, description: description.trim() || null, isPreview: true } };
}
