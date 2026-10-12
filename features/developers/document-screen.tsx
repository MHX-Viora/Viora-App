import { Link, type Href } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { pages } from './content.mjs';

export function DeveloperDocument({ slug = '' }: { slug?: string }) {
  const { theme } = useTheme();
  const page = pages.find(item => item.slug === slug);
  return <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 24, gap: 20 }}>
    <Link href="/" style={{ color: theme.colors.primary }}>ANKT</Link>
    <Text style={{ color: theme.colors.text }}>Mini App nằm trong Tiện ích, ngay dưới Ví.</Text>
    <Text accessibilityRole="header" style={{ fontSize: 30, color: theme.colors.text }}>{page?.title ?? 'Không tìm thấy hướng dẫn'}</Text>
    {page?.sections.map(section => <View key={section.id} style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: theme.colors.text, fontSize: 22 }}>{section.title}</Text>
      {[...section.paragraphs, ...section.items, ...(section.code ? [section.code] : [])].map((text, index) => <Text key={index} selectable style={{ color: theme.colors.text, lineHeight: 24 }}>{text}</Text>)}
    </View>)}
    {pages.map(item => <Link key={item.path} href={item.path as Href} style={{ color: theme.colors.primary }}>{item.title}</Link>)}
    <Link href={"/developers/console" as Href} style={{ color: theme.colors.primary }}>Console</Link>
  </ScrollView>;
}
