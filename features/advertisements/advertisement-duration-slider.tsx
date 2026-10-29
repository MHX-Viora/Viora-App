import { createElement, useMemo, useRef } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';

import { spacing, useTheme } from '@/theme';
import { normalizeAdvertisementDuration } from './advertisement-schedule';

export function AdvertisementDurationSlider({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  const { theme: { colors } } = useTheme();
  const gesture = useRef({ width: 0, startX: 0 });
  const change = useRef(onChange);
  change.current = onChange;
  const responder = useMemo(() => {
    const update = (x: number) => {
      const width = gesture.current.width - 24;
      if (width > 0) change.current(normalizeAdvertisementDuration(1 + (x - 12) / width * 29));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => {
        gesture.current.startX = event.nativeEvent.locationX;
        update(gesture.current.startX);
      },
      onPanResponderMove: (_, state) => update(gesture.current.startX + state.dx),
      onPanResponderTerminationRequest: () => false,
    });
  }, []);
  const percentage = `${(value - 1) / 29 * 100}%` as const;

  return <View style={styles.container}>
    <Text style={[styles.value, { color: colors.primary }]}>{value} ngày</Text>
    {Platform.OS === 'web' ? createElement('input', {
      type: 'range', min: 1, max: 30, step: 1, value,
      'aria-label': 'Thời gian chạy', 'aria-valuetext': `${value} ngày`,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(normalizeAdvertisementDuration(Number(event.target.value))),
      style: { accentColor: colors.primary, cursor: 'pointer', width: '100%', minWidth: 0, height: 44, margin: 0 },
    }) : <View
      {...responder.panHandlers}
      accessible accessibilityRole="adjustable" accessibilityLabel="Thời gian chạy"
      accessibilityValue={{ min: 1, max: 30, now: value, text: `${value} ngày` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'increment') onChange(normalizeAdvertisementDuration(value + 1));
        if (nativeEvent.actionName === 'decrement') onChange(normalizeAdvertisementDuration(value - 1));
      }}
      onLayout={({ nativeEvent }) => { gesture.current.width = nativeEvent.layout.width; }}
      style={styles.touchArea}
    >
      <View pointerEvents="none" style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { backgroundColor: colors.primary, width: percentage }]} />
        <View style={[styles.thumb, { backgroundColor: colors.primary, left: percentage }]} />
      </View>
    </View>}
    <View style={styles.endpoints}><Text style={{ color: colors.textMuted }}>1 ngày</Text><Text style={{ color: colors.textMuted }}>30 ngày</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  value: { fontSize: 16, fontWeight: '800' },
  touchArea: { height: 44, justifyContent: 'center', paddingHorizontal: 12 },
  track: { borderRadius: 3, height: 6 },
  fill: { borderRadius: 3, height: 6 },
  thumb: { borderRadius: 12, height: 24, width: 24, position: 'absolute', top: -9, transform: [{ translateX: -12 }] },
  endpoints: { flexDirection: 'row', justifyContent: 'space-between' },
});
