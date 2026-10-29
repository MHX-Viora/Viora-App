import { getPosts } from '@/services/feed.service';
import type { Article } from '@/types/article';
import type { FeedPost } from '@/types/feed';
import { dedupeHashtags } from '@/utils/hashtag-selection';

export type RelatedArticle = { post: FeedPost; topics: string[] };

export async function getRelatedArticles(article: Pick<Article, 'id' | 'hashtags'>): Promise<RelatedArticle[]> {
  const topics = dedupeHashtags((article.hashtags ?? []).map(tag => tag.name));
  const matches = new Map<string, RelatedArticle>();
  let completed = 0;

  for (let index = 0; index < topics.length; index += 3) {
    const batch = topics.slice(index, index + 3);
    const results = await Promise.allSettled(batch.map(name => getPosts({
      keyword: `#${name}`, postType: 2, sort: 'latest', page: 1, pageSize: 6,
    })));
    results.forEach((result, offset) => {
      if (result.status !== 'fulfilled') return;
      completed++;
      for (const post of result.value.posts) {
        if (post.id === article.id || post.postType !== 2 || !post.article || post.advertisement) continue;
        const entry = matches.get(post.id) ?? { post, topics: [] };
        if (!entry.topics.includes(batch[offset])) entry.topics.push(batch[offset]);
        matches.set(post.id, entry);
      }
    });
  }
  if (topics.length > 0 && completed === 0) throw new Error('Không thể tải bài viết liên quan. Vui lòng thử lại.');
  return Array.from(matches.values()).sort((a, b) => b.topics.length - a.topics.length).slice(0, 4);
}
