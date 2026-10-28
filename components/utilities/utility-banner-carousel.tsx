import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { UtilityBanner } from '@/types/utility-banner';

export function UtilityBannerCarousel({ items, active = true, onOpen, onImageError }: {
  items: UtilityBanner[]; active?: boolean; onOpen: (target: string) => void; onImageError: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [visible, setVisible] = useState(Platform.OS !== 'web' || !document.hidden);
  const [reducedMotion, setReducedMotion] = useState(true);
  const progress = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const currentIndex = index % items.length;
  const firstIndicator = Math.min(Math.max(currentIndex - 2, 0), Math.max(0, items.length - 5));

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReducedMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', state => setForeground(state === 'active'));
    const visibility = () => setVisible(!document.hidden);
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', visibility);
    return () => { alive = false; motion.remove(); app.remove(); if (Platform.OS === 'web') document.removeEventListener('visibilitychange', visibility); };
  }, []);

  const goTo = useCallback((target: number) => {
    if (next !== null || target === currentIndex) return;
    if (reducedMotion || !width) { setIndex(target); return; }
    progress.setValue(0); setNext(target);
  }, [currentIndex, next, progress, reducedMotion, width]);

  useEffect(() => {
    if (next === null) return;
    animation.current = Animated.timing(progress, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' });
    animation.current.start(({ finished }) => { if (finished) { setIndex(next); setNext(null); progress.setValue(0); } });
    return () => animation.current?.stop();
  }, [next, progress]);

  useEffect(() => {
    if (items.length < 2 || !active || !foreground || !visible || hovered || focused || paused || reducedMotion || next !== null) return;
    const timer = setTimeout(() => goTo((currentIndex + 1) % items.length), 4000);
    return () => clearTimeout(timer);
  }, [active, currentIndex, focused, foreground, goTo, hovered, items.length, next, paused, reducedMotion, visible]);

  const slide = (slideIndex: number, incoming: boolean) => {
    const item = items[slideIndex];
    return <Animated.View key={incoming ? 'incoming' : 'current'} testID={incoming ? 'banner-incoming' : 'banner-current'}
      accessibilityElementsHidden={incoming}
      importantForAccessibility={incoming ? 'no-hide-descendants' : 'auto'}
      style={[styles.slide, { pointerEvents: incoming ? 'none' : 'auto', transform: [{ translateX: incoming
        ? progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] })
        : progress.interpolate({ inputRange: [0, 1], outputRange: [0, -width] }) }] }]}>
      <Pressable accessibilityRole={item.targetUrl ? 'button' : 'image'} accessibilityLabel={`Banner tiện ích ${slideIndex + 1}`}
        disabled={!item.targetUrl || incoming} onPress={() => { if (item.targetUrl) onOpen(item.targetUrl); }} style={styles.imageButton}>
        <Image source={{ uri: item.imageUrl }} accessible={false} resizeMode="cover" onError={() => onImageError(item.id)} style={styles.image} />
      </Pressable>
    </Animated.View>;
  };
  return <View testID="utility-banner-carousel" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.frame}>
    <Pressable accessible={false} style={StyleSheet.absoluteFill} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      {slide(currentIndex, false)}
      {next !== null ? slide(next, true) : null}
      {items.length > 1 ? <View style={styles.controls}>
        <View style={styles.dots}>{items.map((item, i) => i < firstIndicator || i >= firstIndicator + 5 ? null : <Pressable key={item.id} accessibilityRole="button"
          accessibilityLabel={`Xem banner ${i + 1}`} accessibilityState={{ selected: i === currentIndex }}
          onPress={() => goTo(i)} style={({ pressed }) => [styles.dotButton, pressed && styles.pressed]}>
          <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
        </Pressable>)}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={paused ? 'Tiếp tục chuyển banner' : 'Tạm dừng chuyển banner'}
          onPress={() => setPaused(value => !value)} style={styles.pause}>
          <Ionicons name={paused ? 'play' : 'pause'} color="#fff" size={16} />
        </Pressable>
      </View> : null}
    </Pressable>
    <Text accessibilityLiveRegion="none" style={styles.srOnly}>{`${currentIndex + 1} / ${items.length}`}</Text>
  </View>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, height: '100%', overflow: 'hidden', borderRadius: 18, backgroundColor: '#EDF6FF' },
  slide: { ...StyleSheet.absoluteFillObject },
  imageButton: { flex: 1 }, image: { width: '100%', height: '100%' },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(7,26,42,0.72)' },
  dots: { flexDirection: 'row', flexShrink: 1 }, dotButton: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#B7C9DA' }, dotActive: { width: 18, backgroundColor: '#fff' },
  pause: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.6 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
