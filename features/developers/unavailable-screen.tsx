import { Link, type Href } from 'expo-router';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';

export default function UnavailableDeveloperScreen() {
  const { theme } = useTheme();
  return <View style={{ flex: 1, justifyContent: 'center', padding: 28, gap: 20, backgroundColor: theme.colors.background }}>
    <Text accessibilityRole="header" style={{ color: theme.colors.text, fontSize: 28, fontWeight: '700' }}>Chức năng chưa khả dụng</Text>
    <Text style={{ color: theme.colors.textMuted, fontSize: 16, lineHeight: 25 }}>Đăng ký Developer và Mini App Console hiện chưa được mở. Bạn có thể đọc hướng dẫn và chuẩn bị website đối tác.</Text>
    <Link href={"/developers/docs" as Href} style={{ color: theme.colors.primary }}>Đọc hướng dẫn tích hợp</Link>
    <Link href="/" style={{ color: theme.colors.primary }}>Về ANKT</Link>
  </View>;
}
