import { memo, useId, useMemo } from "react";
import { Animated, Platform } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { PremiumRocketArt } from "./premium-gift-rocket-art";
import { orbitalFrame, orbitalLayout, ORBITAL_COLORS as C } from "./rocket-orbital-model";

export const RocketOrbitalHero=memo(function RocketOrbitalHero({bounds,progress,reducedMotion}:SceneProps){
  const l=orbitalLayout(bounds),id=useId().replace(/\W/g,"");
  const samples=useMemo(()=>Array.from({length:129},(_,i)=>({p:i/128,...orbitalFrame(i/128,reducedMotion)})),[reducedMotion]);
  const value=(key:"scale"|"bank"|"pitch"|"rocket")=>progress.interpolate({inputRange:samples.map(f=>f.p),outputRange:samples.map(f=>f[key]),extrapolate:"clamp"});
  return <Animated.View pointerEvents="none" style={{position:"absolute",left:0,top:0,width:l.size*.64,height:l.size,
    opacity:value("rocket"),transform:[{translateX:progress.interpolate({inputRange:samples.map(f=>f.p),outputRange:samples.map(f=>f.x*bounds.width-l.size*.32+f.shake),extrapolate:"clamp"})},
      {translateY:progress.interpolate({inputRange:samples.map(f=>f.p),outputRange:samples.map(f=>f.y*bounds.height-l.size*.5),extrapolate:"clamp"})},
      {perspective:800},{rotateX:value("pitch").interpolate({inputRange:[-20,20],outputRange:["-20deg","20deg"]})},{rotateY:value("bank").interpolate({inputRange:[-20,20],outputRange:["-8deg","8deg"]})},
      {rotateZ:value("bank").interpolate({inputRange:[-20,20],outputRange:["-20deg","20deg"]})},{scale:value("scale")} ]}}>
    {Platform.OS!=="web"?<Animated.View style={{position:"absolute",left:l.size*.18,top:l.size*.81,width:l.size*.28,height:l.size*1.6,opacity:progress.interpolate({inputRange:[0,800/8500,1800/8500,1],outputRange:[0,0,1,1]}),transform:[{scaleY:progress.interpolate({inputRange:[0,.21,.35,.82,.92,1],outputRange:[.2,.5,1,1.2,1.5,1]})}]}}><Svg width="100%" height="100%" viewBox="0 0 60 300"><Defs><LinearGradient id={`${id}flame`} x2="0" y2="1"><Stop stopColor={C.white}/><Stop offset=".2" stopColor={C.gold}/><Stop offset=".5" stopColor={C.cyan} stopOpacity=".5"/><Stop offset="1" stopColor={C.magenta} stopOpacity="0"/></LinearGradient></Defs><Path d="M10 0Q-8 70 20 170L30 300L40 170Q68 70 50 0Z" fill={`url(#${id}flame)`}/><Path d="M25 0Q18 55 28 100L30 205L33 100Q42 55 35 0Z" fill={C.white} opacity=".7"/></Svg></Animated.View>:null}
    <PremiumRocketArt height={l.size}/>
  </Animated.View>;
});
