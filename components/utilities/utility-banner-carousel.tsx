import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { UtilityBanner } from '@/types/utility-banner';

export function UtilityBannerCarousel({ items, active = true, onOpen, onImageError }: {
  items: UtilityBanner[]; active?: boolean; onOpen: (target: string) => void; onImageError: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
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

  const goTo = useCallback((target: number, slideDirection = 1) => {
    if (next !== null || target === currentIndex) return;
    if (reducedMotion || !width) { setIndex(target); return; }
    setDirection(slideDirection); progress.setValue(0); setNext(target);
  }, [currentIndex, next, progress, reducedMotion, width]);

  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => items.length > 1 && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) < 32) return;
      const step = gesture.dx < 0 ? 1 : -1;
      goTo((currentIndex + step + items.length) % items.length, step);
    },
  }), [currentIndex, goTo, items.length]);

  useEffect(() => {
    if (next === null) return;
    animation.current = Animated.timing(progress, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' });
    animation.current.start(({ finished }) => { if (finished) { setIndex(next); setNext(null); progress.setValue(0); } });
    return () => animation.current?.stop();
  }, [next, progress]);

  useEffect(() => {
    if (items.length < 2 || !active || !foreground || !visible || hovered || focused || reducedMotion || next !== null) return;
    const timer = setTimeout(() => goTo((currentIndex + 1) % items.length), 4000);
    return () => clearTimeout(timer);
  }, [active, currentIndex, focused, foreground, goTo, hovered, items.length, next, reducedMotion, visible]);

  const slide = (slideIndex: number, incoming: boolean) => {
    const item = items[slideIndex];
    return <Animated.View key={incoming ? 'incoming' : 'current'} testID={incoming ? 'banner-incoming' : 'banner-current'}
      accessibilityElementsHidden={incoming}
      importantForAccessibility={incoming ? 'no-hide-descendants' : 'auto'}
      style={[styles.slide, { pointerEvents: incoming ? 'none' : 'auto', transform: [{ translateX: incoming
        ? progress.interpolate({ inputRange: [0, 1], outputRange: [width * direction, 0] })
        : progress.interpolate({ inputRange: [0, 1], outputRange: [0, -width * direction] }) }] }]}>
      <Pressable accessibilityRole={item.targetUrl ? 'button' : 'image'} accessibilityLabel={`Banner tiện ích ${slideIndex + 1}`}
        disabled={!item.targetUrl || incoming} onPress={() => { if (item.targetUrl) onOpen(item.targetUrl); }} style={styles.imageButton}>
        <Image testID="banner-backdrop" source={{ uri: item.imageUrl }} accessible={false} accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants" resizeMode="cover" blurRadius={18} style={[styles.image, styles.backdrop]} />
        <Image testID="banner-artwork" source={{ uri: item.imageUrl }} accessible={false} resizeMode="contain" onError={() => onImageError(item.id)} style={styles.image} />
      </Pressable>
    </Animated.View>;
  };
  return <View testID="utility-banner-carousel" {...swipe.panHandlers} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.frame}>
    <Pressable accessible={false} style={StyleSheet.absoluteFill} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      {slide(currentIndex, false)}
      {next !== null ? slide(next, true) : null}
      {items.length > 1 ? <View style={styles.controls}><View testID="banner-page-control" style={styles.pageControl}>
        <View style={styles.dots}>{items.map((item, i) => i < firstIndicator || i >= firstIndicator + 5 ? null : <Pressable key={item.id} accessibilityRole="button"
          accessibilityLabel={`Xem banner ${i + 1}`} accessibilityState={{ selected: i === currentIndex }}
          onPress={() => goTo(i, i < currentIndex ? -1 : 1)} style={({ pressed }) => [styles.dotButton, pressed && styles.pressed]}>
          <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
        </Pressable>)}</View>
      </View></View> : null}
    </Pressable>
    <Text accessibilityLiveRegion="none" style={styles.srOnly}>{`${currentIndex + 1} / ${items.length}`}</Text>
  </View>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, height: '100%', overflow: 'hidden', borderRadius: 18, backgroundColor: '#EDF6FF' },
  slide: { ...StyleSheet.absoluteFillObject },
  imageButton: { flex: 1, overflow: 'hidden' }, image: { width: '100%', height: '100%' },
  backdrop: { ...StyleSheet.absoluteFillObject, opacity: 0.6, transform: [{ scale: 1.12 }] },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', pointerEvents: 'box-none' },
  pageControl: { flexDirection: 'row', alignItems: 'center' },
  dots: { flexDirection: 'row', flexShrink: 1 }, dotButton: { height: 20, width: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' }, dotActive: { width: 16, backgroundColor: '#fff' },
  pressed: { opacity: 0.6 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
