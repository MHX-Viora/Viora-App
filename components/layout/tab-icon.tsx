import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { communityColors as colors } from '@/features/feed/community-colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function TabIcon({
  focused,
  name,
}: {
  focused: boolean;
  name: IconName;
}) {
  return (
    <View style={[styles.container, focused && styles.focused]}>
      <Ionicons
        color={focused ? colors.primary : colors.textMuted}
        name={name}
        size={23}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 18,
    height: 32,
    justifyContent: 'center',
    width: 44,
  },
  focused: {
    backgroundColor: colors.primarySoft,
    elevation: 9,
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
});
