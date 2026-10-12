import { useLocalSearchParams } from 'expo-router';
import { DeveloperDocument } from '@/features/developers/document-screen';
export default function ArticlePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <DeveloperDocument slug={slug} />;
}
