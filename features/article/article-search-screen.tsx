import { useIsFocused } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FeedSearchModal } from '@/components/feed/feed-search-modal';
import type { PostFeedSort } from '@/types/feed';

export function ArticleSearchScreen() {
  const { hashtag } = useLocalSearchParams<{ hashtag?: string }>();
  const isFocused = useIsFocused();
  const [sort, setSort] = useState<PostFeedSort>('recommended');
  const name = (hashtag ?? '').trim().replace(/^#+/, '');

  return <FeedSearchModal
    key={name}
    initialQuery={name ? `#${name}` : ''}
    category="articles"
    articleSort={sort}
    onArticleSortChange={setSort}
    onClose={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/', params: { category: 'articles' } })}
    onOpenArticle={id => router.push({ pathname: '/article/[id]', params: { id } })}
    visible={isFocused}
  />;
}
