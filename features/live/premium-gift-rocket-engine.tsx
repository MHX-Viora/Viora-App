import type { RocketProgress } from "./premium-gift-rocket-progress";
import { useMemo } from "react";
import { Animated } from "react-native";
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";
import { RocketGlow } from "./premium-gift-rocket-environment";
import { rocketFlameFrames } from "./premium-gift-rocket-energy-model";
import { ROCKET_COLORS as C } from "./premium-gift-rocket-model";

export function RocketEngine({ size, progress }: { size: number; progress: RocketProgress }) {
  const frames = useMemo(rocketFlameFrames, []);
  const length = progress.interpolate({ inputRange: frames.times, outputRange: frames.length, extrapolate: "clamp" });
  const width = progress.interpolate({ inputRange: frames.times, outputRange: frames.width, extrapolate: "clamp" });
  const sway = progress.interpolate({ inputRange: frames.times, outputRange: frames.sway, extrapolate: "clamp" });
  const opacity = progress.interpolate({ inputRange: [0, .167, .215, .55, .58, 1], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: "clamp" });
  const bloom = progress.interpolate({ inputRange: [0, .167, .22, .417, .435, .54, .58, 1], outputRange: [0, 0, .45, .65, 1, .85, 0, 0], extrapolate: "clamp" });
  const plumeHeight = size * .72;
  const boostEnvelope = progress.interpolate({inputRange:[0,.398,.403,.417,.430,.452,1],outputRange:[1,1,.50,.40,1.18,1.1,1.1],extrapolate:"clamp"});
  const flameLength = Animated.multiply(length,boostEnvelope);
  return <>
    <RocketReactorCore size={size} progress={progress} />
    <Animated.View style={{ position: "absolute", left: -size * .16, top: size * .53, opacity: bloom, transform: [{ scale: width }] }}><RocketGlow color={C.orange} size={size * .96} white /></Animated.View>
    <Animated.View style={{ position: "absolute", left: -size * .06, top: size * .80, width: size * .76, height: plumeHeight, opacity,
      transform: [{ translateX: sway }, { translateY: Animated.multiply(Animated.subtract(flameLength, 1), plumeHeight / 2) }, { scaleY: flameLength }, { scaleX: Animated.multiply(width,1.14) }] }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 200"><Defs>
        <RadialGradient id="engineEdge"><Stop stopColor={C.pink} stopOpacity=".7" /><Stop offset=".35" stopColor={C.violet} stopOpacity=".3" /><Stop offset=".8" stopColor={C.cyan} stopOpacity=".08" /><Stop offset="1" stopColor={C.cyan} stopOpacity="0" /></RadialGradient>
        <RadialGradient id="engineOuter"><Stop stopColor={C.orange} stopOpacity=".9" /><Stop offset=".4" stopColor={C.pink} stopOpacity=".65" /><Stop offset="1" stopColor={C.pink} stopOpacity="0" /></RadialGradient>
        <LinearGradient id="engineMiddle" x1="0" x2="0" y1="0" y2="1"><Stop stopColor="#FFF4B0" /><Stop offset=".34" stopColor={C.gold} stopOpacity=".95" /><Stop offset=".68" stopColor={C.orange} stopOpacity=".55" /><Stop offset="1" stopColor={C.orange} stopOpacity="0" /></LinearGradient>
        <LinearGradient id="engineInner" x1="0" x2="0" y1="0" y2="1"><Stop stopColor={C.white} /><Stop offset=".46" stopColor="#FFF4B0" /><Stop offset="1" stopColor="#FFF4B0" stopOpacity="0" /></LinearGradient>
      </Defs>
        <Ellipse cx="50" cy="88" rx="48" ry="106" fill="url(#engineEdge)" />
        <Ellipse cx="50" cy="74" rx="35" ry="93" fill="url(#engineOuter)" />
        <Path d="M32 3 C24 30 28 60 36 89 C41 111 45 151 50 184 C55 147 63 119 66 87 C76 52 75 22 68 3Z" fill="url(#engineMiddle)" />
        <Path d="M39 1 C35 24 38 45 44 68 C48 90 48 116 50 141 C54 111 54 87 59 66 C64 43 65 20 61 1Z" fill="url(#engineInner)" />
        <Ellipse cx="50" cy="18" rx="9" ry="26" fill="url(#engineInner)" />
        <Ellipse cx="50" cy="4" rx="16" ry="5" fill={C.white} />
      </Svg>
    </Animated.View>
    <RocketEnergyExhaust size={size} progress={progress} />
    <RocketVortex size={size} progress={progress} />
  </>;
}

function RocketReactorCore({size,progress}:{size:number;progress:RocketProgress}) {
  const frames=useMemo(rocketFlameFrames,[]),coreSize=size*.68;
  const pulse=progress.interpolate({inputRange:frames.times,outputRange:frames.width.map((n)=>.85+(n-.7)*.85),extrapolate:"clamp"});
  const visible=progress.interpolate({inputRange:[0,.167,.215,.55,.58,1],outputRange:[0,0,.85,.85,0,0],extrapolate:"clamp"});
  const white=progress.interpolate({inputRange:[0,.417,.420,.440,.442,1],outputRange:[0,0,1,.9,0,0],extrapolate:"clamp"});
  return <>
    <Animated.View style={{position:"absolute",left:size*.32-coreSize/2,top:size*.82-coreSize/2,opacity:visible,transform:[{scale:pulse}]}}>
      <Svg width={coreSize} height={coreSize} viewBox="0 0 100 100"><Defs><RadialGradient id="rocketReactor"><Stop stopColor={C.white} /><Stop offset=".08" stopColor="#FFF4B0" /><Stop offset=".21" stopColor={C.orange} stopOpacity=".9" /><Stop offset=".4" stopColor={C.pink} stopOpacity=".55" /><Stop offset=".7" stopColor={C.cyan} stopOpacity=".14" /><Stop offset="1" stopColor={C.cyan} stopOpacity="0" /></RadialGradient></Defs><Ellipse cx="50" cy="50" rx="49" ry="49" fill="url(#rocketReactor)" /><Ellipse cx="50" cy="50" rx="5" ry="9" fill={C.white} /></Svg>
    </Animated.View>
    <Animated.View style={{position:"absolute",left:size*.32-coreSize/2,top:size*.82-coreSize/2,opacity:white}}><RocketGlow size={coreSize} color={C.white} white /></Animated.View>
  </>;
}

function RocketVortex({ size, progress }: { size: number; progress: RocketProgress }) {
  const opacity = progress.interpolate({ inputRange: [0, .36, .417, .45, .54, .58, 1], outputRange: [0, 0, .35, .85, .6, 0, 0], extrapolate: "clamp" });
  const length = progress.interpolate({ inputRange: [0, .417, .48, .567, 1], outputRange: [.3, .3, 1, 1.8, 1.8], extrapolate: "clamp" });
  const height = size * 1.4;
  return <>{[C.cyan, C.pink, C.gold].map((color, index) => <Animated.View key={color} style={{ position: "absolute", left: -size * .12, top: size * .67, width: size * .88, height, opacity,
    transform: [{ translateY: Animated.multiply(Animated.subtract(length, 1), height / 2) }, { scaleY: length }, { rotate: progress.interpolate({ inputRange: [0, .38, .43, .48, .53, .567, 1], outputRange: ["0deg", "0deg", `${(index - 1) * 5}deg`, `${(1 - index) * 4}deg`, `${(index - 1) * 3}deg`, "0deg", "0deg"], extrapolate: "clamp" }) }] }}>
    <Svg width="100%" height="100%" viewBox="0 0 120 300"><Defs><LinearGradient id={`vortex-${index}`} x1="0" x2="0" y1="0" y2="1"><Stop stopColor={color} stopOpacity="0" /><Stop offset=".1" stopColor={color} stopOpacity=".9" /><Stop offset=".5" stopColor={color} stopOpacity=".6" /><Stop offset="1" stopColor={color} stopOpacity="0" /></LinearGradient></Defs><Path d={`M${24 + index * 18} 3 C${index % 2 ? 102 : 6} 56 ${index % 2 ? 5 : 112} 82 60 135 C${index % 2 ? 112 : 14} 184 ${index % 2 ? 10 : 107} 228 60 300`} fill="none" stroke={`url(#vortex-${index})`} strokeWidth="10" opacity=".1" /><Path d={`M${24 + index * 18} 3 C${index % 2 ? 102 : 6} 56 ${index % 2 ? 5 : 112} 82 60 135 C${index % 2 ? 112 : 14} 184 ${index % 2 ? 10 : 107} 228 60 300`} fill="none" stroke={`url(#vortex-${index})`} strokeWidth="2" /></Svg>
  </Animated.View>)}</>;
}

function RocketEnergyExhaust({ size, progress }: { size: number; progress: RocketProgress }) {
  const opacity = progress.interpolate({ inputRange: [0, .25, .32, .417, .45, .55, .58, 1], outputRange: [0, 0, .2, .55, .9, .7, 0, 0], extrapolate: "clamp" });
  const length = progress.interpolate({ inputRange: [0, .25, .417, .48, .567, 1], outputRange: [.2, .2, .85, 1.8, 2.2, 2.2], extrapolate: "clamp" });
  const height = size * 1.2;
  return <Animated.View style={{ position: "absolute", left: size * .08, top: size * .81, width: size * .48, height, opacity,
    transform: [{ translateY: Animated.multiply(Animated.subtract(length, 1), height / 2) }, { scaleY: length }, { scaleX: progress.interpolate({ inputRange: [0, .417, .45, .50, .55, 1], outputRange: [.8, .8, 1.1, .9, 1.15, 1.15], extrapolate: "clamp" }) }] }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 320"><Defs>
      <LinearGradient id="energyExhaust" x1="0" x2="0" y1="0" y2="1"><Stop stopColor={C.white} /><Stop offset=".14" stopColor={C.gold} /><Stop offset=".35" stopColor={C.orange} stopOpacity=".8" /><Stop offset=".58" stopColor={C.pink} stopOpacity=".55" /><Stop offset=".8" stopColor={C.violet} stopOpacity=".18" /><Stop offset="1" stopColor={C.cyan} stopOpacity="0" /></LinearGradient>
      <LinearGradient id="energyExhaustCore" x1="0" x2="0" y1="0" y2="1"><Stop stopColor={C.white} /><Stop offset=".25" stopColor="#FFF4B0" stopOpacity=".9" /><Stop offset="1" stopColor={C.gold} stopOpacity="0" /></LinearGradient>
    </Defs><Path d="M25 0 C16 50 37 85 28 130 C23 173 45 238 50 320 C54 235 76 179 69 128 C62 82 85 45 75 0Z" fill="url(#energyExhaust)" opacity=".55" /><Path d="M41 0 C35 72 49 111 44 159 C41 205 48 256 50 306 C52 251 57 204 56 158 C51 108 65 65 59 0Z" fill="url(#energyExhaustCore)" />
      <Path d="M22 2 C2 51 85 68 23 126 C5 166 69 211 46 307 M75 2 C96 57 14 74 77 133 C93 184 36 221 55 310" stroke="url(#energyExhaust)" strokeWidth="3" fill="none" />
    </Svg>
  </Animated.View>;
}
