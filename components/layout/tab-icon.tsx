import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function TabIcon({ focused, name }: { focused: boolean; name: IconName }) {
  return (
    <View style={[styles.container, focused && styles.focused]}>
      <Ionicons name={name} size={23} color={focused ? colors.primary : colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 48,
  },
  focused: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
  },
});
