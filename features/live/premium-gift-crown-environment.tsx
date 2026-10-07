import { memo, useId } from "react";
import { Animated, StyleSheet } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop, Rect } from "react-native-svg";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { CROWN_ANIMATION_DURATION, ROYAL_GOLD, type crownLayout } from "./premium-gift-crown-model";

type Props = { bounds: SceneProps["bounds"]; layout: ReturnType<typeof crownLayout>; progress: Animated.Value; reducedMotion: boolean; quality: SceneProps["quality"] };
const seconds = (value: number) => value * 1000 / CROWN_ANIMATION_DURATION;
const position = (layout: Props["layout"], size: number, zIndex: number) => ({ position: "absolute" as const, left: layout.x - size / 2, top: layout.y - size / 2, width: size, height: size, zIndex });
const curve = (progress: Animated.Value, times: number[], values: number[]) => progress.interpolate({ inputRange: times.map(seconds), outputRange: values, extrapolate: "clamp" });
const useGradientId = (name: string) => `${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

export const RoyalAtmosphere = memo(function RoyalAtmosphere({ layout, progress, reducedMotion }: Props) {
  const id = useGradientId("royal-atmosphere"); const vignette = useGradientId("royal-vignette");
  const dim = curve(progress, [0, .7, 1.8, 5.6, 6.5], [0, .09, .12, .1, 0]);
  const glow = curve(progress, [0, .7, 1.8, 2.9, 3.2, 5.6, 6.5], [0, .08, .42, .65, .38, .3, 0]);
  return <>
    <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: dim, zIndex: 0 }]}>
      <Svg width="100%" height="100%"><Defs><RadialGradient id={vignette}><Stop offset="0" stopColor="#100B05" stopOpacity=".18" /><Stop offset=".65" stopColor="#100B05" stopOpacity=".55" /><Stop offset="1" stopColor="#100B05" /></RadialGradient></Defs><Rect width="100%" height="100%" fill={`url(#${vignette})`} /></Svg>
    </Animated.View>
    <Animated.View style={[position(layout, layout.auraSize, 1), { opacity: glow }]}>
      <Svg width="100%" height="100%" viewBox="0 0 200 200"><Defs><RadialGradient id={id}><Stop offset="0" stopColor={ROYAL_GOLD.champagne} stopOpacity={reducedMotion ? .23 : .48} /><Stop offset=".35" stopColor={ROYAL_GOLD.gold} stopOpacity=".16" /><Stop offset="1" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /></RadialGradient></Defs><Circle cx="100" cy="100" r="100" fill={`url(#${id})`} /></Svg>
    </Animated.View>
  </>;
});

export const RoyalArrival = memo(function RoyalArrival({ bounds, layout, progress, reducedMotion }: Props) {
  const id = useGradientId("royal-arrival");
  if (reducedMotion) return null;
  const beam = curve(progress, [0, .1, .3, .6, .7, 6.5], [0, 0, .75, .45, 0, 0]);
  const travel = curve(progress, [0, .1, .7, 6.5], [-bounds.width, -bounds.width, bounds.width, bounds.width]);
  const point = curve(progress, [0, .28, .5, .7, 1.8, 2.4, 6.5], [0, 0, .3, 1, 1, 0, 0]);
  const scale = curve(progress, [0, .28, .5, .7, 1.8, 6.5], [0, 0, .3, 1, 2, 2]);
  return <>
    <Animated.View style={{ position: "absolute", left: 0, top: layout.y, width: bounds.width, height: 2, opacity: beam, zIndex: 2, transform: [{ translateX: travel }] }}>
      <Svg width="100%" height="100%"><Defs><LinearGradient id={id}><Stop offset="0" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /><Stop offset=".5" stopColor={ROYAL_GOLD.highlight} /><Stop offset="1" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /></LinearGradient></Defs><Rect width="100%" height="100%" fill={`url(#${id})`} /></Svg>
    </Animated.View>
    <Animated.View style={{ position: "absolute", left: layout.x - 5, top: layout.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: ROYAL_GOLD.champagne, opacity: point, transform: [{ scale }], zIndex: 3 }} />
  </>;
});

export const RoyalHalo = memo(function RoyalHalo({ layout, progress, reducedMotion }: Props) {
  const id = useGradientId("royal-halo");
  const opacity = curve(progress, [0, .7, 1.45, 1.8, 3.2, 3.65, 5.6, 6.5], [0, 0, .8, .3, .3, .65, .3, 0]);
  const scale = curve(progress, [0, .7, 1.8, 3.2, 3.65, 5.6, 6.5], [.2, .2, 1.15, 1.05, 1.12, 1.08, 1.4]);
  const rotation = progress.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "9deg"] });
  return <Animated.View style={[position(layout, layout.auraSize, 1), { opacity, transform: reducedMotion ? [] : [{ scale }, { rotate: rotation }] }]}>
    <Svg width="100%" height="100%" viewBox="0 0 240 240"><Defs><RadialGradient id={id}><Stop offset="0" stopColor={ROYAL_GOLD.highlight} stopOpacity=".1" /><Stop offset=".54" stopColor={ROYAL_GOLD.gold} stopOpacity=".03" /><Stop offset=".58" stopColor={ROYAL_GOLD.champagne} stopOpacity=".35" /><Stop offset=".62" stopColor={ROYAL_GOLD.gold} stopOpacity=".04" /><Stop offset="1" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /></RadialGradient></Defs>
      <Circle cx="120" cy="120" r="120" fill={`url(#${id})`} />
      <Ellipse cx="120" cy="120" rx="90" ry="35" transform="rotate(-24 120 120)" fill="none" stroke={ROYAL_GOLD.champagne} strokeOpacity=".22" strokeWidth=".8" />
      <Ellipse cx="120" cy="120" rx="86" ry="39" transform="rotate(28 120 120)" fill="none" stroke={ROYAL_GOLD.gold} strokeOpacity=".18" strokeWidth="1" />
    </Svg>
  </Animated.View>;
});

export const RoyalRays = memo(function RoyalRays({ layout, progress, reducedMotion, quality }: Props) {
  const id = useGradientId("royal-rays");
  if (reducedMotion || quality === "low") return null;
  const opacity = curve(progress, [0, .7, 1.8, 3.2, 5.6, 6.5], [0, 0, .35, .22, .14, 0]);
  const scale = curve(progress, [0, .7, 1.8, 5.6, 6.5], [.15, .15, 1, 1.1, 1.2]);
  return <Animated.View style={[position(layout, layout.auraSize * 1.15, 1), { opacity, transform: [{ scale }] }]}>
    <Svg width="100%" height="100%" viewBox="0 0 240 240"><Defs><LinearGradient id={id} x1="0" x2="0" y1="1" y2="0"><Stop offset="0" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /><Stop offset=".4" stopColor={ROYAL_GOLD.champagne} stopOpacity=".1" /><Stop offset=".7" stopColor={ROYAL_GOLD.highlight} stopOpacity=".4" /><Stop offset="1" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /></LinearGradient></Defs>
      {Array.from({ length: 8 }, (_, index) => <Path key={index} d="M115 106 Q109 65 102 12 Q120 6 138 12 Q131 65 125 106Z" fill={`url(#${id})`} transform={`rotate(${index * 45 + 13} 120 120)`} />)}
    </Svg>
  </Animated.View>;
});

export const RoyalLightBurst = memo(function RoyalLightBurst({ layout, progress, reducedMotion }: Props) {
  const id = useGradientId("royal-flash");
  if (reducedMotion) return null;
  const opacity = curve(progress, [0, 2.82, 2.92, 3.08, 3.2, 6.5], [0, 0, .7, .2, 0, 0]);
  const scale = curve(progress, [0, 2.82, 3.2, 6.5], [.45, .45, 1.1, 1.1]);
  return <Animated.View style={[position(layout, layout.auraSize * .8, 3), { opacity, transform: [{ scale }] }]}>
    <Svg width="100%" height="100%" viewBox="0 0 200 200"><Defs><RadialGradient id={id}><Stop offset="0" stopColor={ROYAL_GOLD.highlight} stopOpacity=".8" /><Stop offset=".25" stopColor={ROYAL_GOLD.champagne} stopOpacity=".4" /><Stop offset=".65" stopColor={ROYAL_GOLD.gold} stopOpacity=".1" /><Stop offset="1" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /></RadialGradient></Defs><Circle cx="100" cy="100" r="100" fill={`url(#${id})`} /></Svg>
  </Animated.View>;
});

export const RoyalCrownShadow = memo(function RoyalCrownShadow({ layout, progress }: Props) {
  const id = useGradientId("royal-shadow");
  const opacity = curve(progress, [0, 1.8, 2.9, 5.6, 6.2, 6.5], [0, 0, .5, .4, 0, 0]);
  return <Animated.View style={[position(layout, layout.size * 1.3, 2), { opacity }]}>
    <Svg width="100%" height="100%" viewBox="0 0 200 200"><Defs><RadialGradient id={id}><Stop offset="0" stopColor={ROYAL_GOLD.champagne} stopOpacity=".35" /><Stop offset=".5" stopColor={ROYAL_GOLD.shadow} stopOpacity=".3" /><Stop offset="1" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /></RadialGradient></Defs><Ellipse cx="100" cy="105" rx="98" ry="77" fill={`url(#${id})`} /></Svg>
  </Animated.View>;
});

export const RoyalLightColumn = memo(function RoyalLightColumn({ layout, progress, reducedMotion, quality, bounds }: Props) {
  const id = useGradientId("royal-column");
  if (reducedMotion || quality === "low") return null;
  const width = layout.size * .65; const height = Math.min(layout.size * 2, bounds.height * .7);
  const opacity = curve(progress, [0, .7, 1.8, 2.9, 3.2, 5.6, 6.5], [0, 0, .2, .25, .08, .06, 0]);
  return <Animated.View style={{ position: "absolute", left: layout.x - width / 2, top: layout.y - height * .55, width, height, opacity, zIndex: 1 }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 200"><Defs><RadialGradient id={id}><Stop offset="0" stopColor={ROYAL_GOLD.highlight} stopOpacity=".6" /><Stop offset=".5" stopColor={ROYAL_GOLD.champagne} stopOpacity=".19" /><Stop offset="1" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /></RadialGradient></Defs><Rect width="100" height="200" fill={`url(#${id})`} /></Svg>
  </Animated.View>;
});

export const RoyalShockwave = memo(function RoyalShockwave({ layout, progress, reducedMotion }: Props) {
  const id = useGradientId("royal-shockwave");
  if (reducedMotion) return null;
  const opacity = curve(progress, [0, 3.6, 3.65, 4.45, 6.5], [0, 0, .45, 0, 0]);
  const scale = curve(progress, [0, 3.6, 4.45, 6.5], [.4, .4, 2.2, 2.2]);
  return <Animated.View style={[position(layout, layout.size, 3), { opacity, transform: [{ scale }] }]}>
    <Svg width="100%" height="100%" viewBox="0 0 200 200"><Defs><RadialGradient id={id}><Stop offset=".77" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /><Stop offset=".86" stopColor={ROYAL_GOLD.champagne} stopOpacity=".3" /><Stop offset=".9" stopColor={ROYAL_GOLD.highlight} stopOpacity=".5" /><Stop offset="1" stopColor={ROYAL_GOLD.gold} stopOpacity="0" /></RadialGradient></Defs><Circle cx="100" cy="100" r="100" fill={`url(#${id})`} /></Svg>
  </Animated.View>;
});
