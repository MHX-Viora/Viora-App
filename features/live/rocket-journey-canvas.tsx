import { useMemo } from "react";
import { Animated, View, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { NativeFireworksRenderer } from "./fireworks-renderer-native";
import { RocketNativeSupport } from "./rocket-journey-native-flight";
import { RocketNativeFinale } from "./rocket-journey-native-finale";
import { rocketLayout, ROCKET_COLORS as C } from "./premium-gift-rocket-model";
import { rocketJourneyPoint, rocketJourneyBudget, rocketFinalePlan, JOURNEY as J } from "./rocket-journey-model";

export function RocketJourneyCanvas(props:SceneProps) {
  const {bounds,progress,quality,reducedMotion,effect}=props;
  const layout=useMemo(()=>rocketLayout(bounds,effect.variant ?? 0),[bounds,effect.variant]),budget=useMemo(()=>rocketJourneyBudget(quality),[quality]);
  const finale=useMemo(()=>rocketFinalePlan(quality,layout.end.x / bounds.width),[quality,layout.end.x,bounds.width]);
  const times=useMemo(()=>[0,...Array.from({length:33},(_,i)=>J.launch+i/32*(J.arrival-J.launch)),1],[]);
  const points=useMemo(()=>times.map(t=>rocketJourneyPoint(layout,t)),[layout,times]);
  const cohorts=useMemo(()=>[C.gold,C.pink,C.cyan].flatMap((color,i)=>[0,1,2].map(depth=>({color,depth,path:Array.from({length:Math.round(budget.field/9)},(_,n)=>{
    const x=(n%2?-1:1)*(18+(n*17+i*7)%70),y=-80+(n*31+i*11)%165,s=depth?2:1;
    return n%4===0?`M${x} ${y-s*2} l${s} ${s*2} l${-s} ${s*2} l${-s} ${-s*2}Z`:n%3===0?`M${x-2} ${y} l4 0 l-2 3Z`:`M${x} ${y} l-1 5 l2 0Z`;
  }).join(" ")}))),[budget]);
  if(reducedMotion)return null;
  const opacity=progress.interpolate({inputRange:[0,J.launch,J.launch+.02,J.portal,J.arrival,1],outputRange:[0,0,.65,.65,0,0],extrapolate:"clamp"});
  return <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
    <RocketNativeSupport {...props} layout={layout} />
    <RocketNativeFinale {...props} layout={layout} />
    {cohorts.map((c,i)=><Animated.View key={i} style={{position:"absolute",left:-layout.size,top:-layout.size,opacity:Animated.multiply(opacity,c.depth?1:.35),transform:[{translateX:progress.interpolate({inputRange:times,outputRange:points.map(p=>p.x),extrapolate:"clamp"})},{translateY:progress.interpolate({inputRange:times,outputRange:points.map(p=>p.y),extrapolate:"clamp"})},{scale:progress.interpolate({inputRange:[0,J.boost,J.portal,J.arrival,1],outputRange:[.7,.7,1.5,1.8,1.8],extrapolate:"clamp"})},{rotate:progress.interpolate({inputRange:[0,1],outputRange:["0deg",`${i%2?32:-32}deg`]})}]}}>
      <Svg width={layout.size*2} height={layout.size*2} viewBox="-100 -100 200 200"><Path d={c.path} fill={c.color} stroke={c.color} strokeWidth="5" opacity=".13" /><Path d={c.path} fill={c.color} /></Svg>
    </Animated.View>)}
    {[C.gold,C.pink,C.cyan].map((color,i)=><Animated.View key={color} style={{position:"absolute",left:-layout.size*.50,top:0,opacity:Animated.multiply(opacity,.5),transform:[{translateX:progress.interpolate({inputRange:times,outputRange:points.map(p=>p.x),extrapolate:"clamp"})},{translateY:progress.interpolate({inputRange:times,outputRange:points.map(p=>p.y+layout.size*.25),extrapolate:"clamp"})},{rotate:progress.interpolate({inputRange:[0,J.boost,J.portal,1],outputRange:["-10deg","-10deg","-30deg","-30deg"],extrapolate:"clamp"})},{scaleY:progress.interpolate({inputRange:[0,J.boost,J.portal,J.arrival,1],outputRange:[.4,.4,1.8,2.1,2.1],extrapolate:"clamp"})}]}}>
      <Svg width={layout.size} height={layout.size*1.7} viewBox="0 0 100 220"><Defs><LinearGradient id={`world-ribbon-${i}`} x1="0" y1="0" x2="0" y2="1"><Stop stopColor={color} /><Stop offset=".5" stopColor={color} stopOpacity=".45" /><Stop offset="1" stopColor={color} stopOpacity="0" /></LinearGradient></Defs><Path d={`M${25+i*23} 0 C${i%2?90:5} 48 ${i%2?5:95} 75 50 110 C${i%2?90:5} 156 ${i%2?5:95} 180 50 220`} fill="none" stroke={`url(#world-ribbon-${i})`} strokeWidth="9" opacity=".18" /><Path d={`M${25+i*23} 0 C${i%2?90:5} 48 ${i%2?5:95} 75 50 110 C${i%2?90:5} 156 ${i%2?5:95} 180 50 220`} fill="none" stroke={`url(#world-ribbon-${i})`} strokeWidth="2" /></Svg>
    </Animated.View>)}
    <Animated.View style={[StyleSheet.absoluteFillObject,{opacity:progress.interpolate({inputRange:[0,J.arrival-.002,J.arrival,J.burst,J.burst+.001,1],outputRange:[1,1,0,0,1,1],extrapolate:"clamp"})}]}><NativeFireworksRenderer {...props} show={finale} /></Animated.View>
  </View>;
}
