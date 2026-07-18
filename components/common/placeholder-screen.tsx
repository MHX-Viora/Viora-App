import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function PlaceholderScreen({ icon, title }: { icon: IconName; title: string }) {
  return (
    <SafeAreaView style={styles.container}>
      <Ionicons color={colors.primary} name={icon} size={44} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.caption}>Tính năng đang được hoàn thiện.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  caption: { color: colors.textMuted, ...typography.body },
  container: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: spacing.sm, justifyContent: 'center' },
  title: { color: colors.text, ...typography.title },
});
