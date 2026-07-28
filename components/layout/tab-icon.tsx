import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { type AppTheme, useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function TabIcon({
  focused,
  name,
}: {
  focused: boolean;
  name: IconName;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.container, focused && styles.focused]}>
      <Ionicons
        color={focused ? theme.colors.primary : theme.colors.textMuted}
        name={name}
        size={23}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 18,
    height: 32,
    justifyContent: 'center',
    width: 44,
  },
  focused: {
    backgroundColor: theme.colors.primarySoft,
    elevation: theme.isDark ? 9 : 0,
    shadowColor: theme.colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: theme.isDark ? 0.9 : 0,
    shadowRadius: theme.isDark ? 10 : 0,
  },
});
