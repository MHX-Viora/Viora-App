import { Animated } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { ROCKET_COLORS as C, type RocketLayout } from "./premium-gift-rocket-model";
import { JOURNEY as J, rocketJourneyBudget, rocketGates } from "./rocket-journey-model";

// Cohorts keep native node counts independent of particle counts.
export function RocketNativeFinale({layout,progress,quality}:SceneProps&{layout:RocketLayout}) {
  const budget=rocketJourneyBudget(quality),colors=[C.gold,C.pink,C.cyan];
  const rain=Array.from({length:Math.round(budget.field*.65)},(_,i)=>{const x=-75+(i*31)%150,y=-30+(i*17)%60;return i%7===0?`M${x} ${y-2} l2 2 l-2 2 l-2 -2Z`:`M${x} ${y} l0 3`;}).join(" ");
  return <>
    {rocketGates(layout).map(g=><Animated.View key={g.at} style={{position:"absolute",left:g.point.x-layout.size/2,top:g.point.y-layout.size/2,opacity:progress.interpolate({inputRange:[0,g.at,g.at+.01,g.at+.07,1],outputRange:[0,0,.85,0,0],extrapolate:"clamp"}),transform:[{scale:progress.interpolate({inputRange:[0,g.at,g.at+.07,1],outputRange:[.3,.3,1.7,1.7],extrapolate:"clamp"})},{rotate:progress.interpolate({inputRange:[0,1],outputRange:["0deg","90deg"]})}]}}><Svg width={layout.size} height={layout.size} viewBox="-100 -100 200 200"><Path d={Array.from({length:10},(_,i)=>{const a=i*Math.PI/5,x=Math.cos(a)*70,y=Math.sin(a)*70;return `M${x} ${y-3} l2 3 l-2 3 l-2 -3Z`;}).join(" ")} fill={g.color} /></Svg></Animated.View>)}
    {Array.from({length:budget.swarm},(_,i)=>{
      const start=J.swarm+i*.007,at=start+.075,a=-Math.PI*.92+i/budget.swarm*Math.PI*1.85,x=Math.cos(a)*layout.burstRadius*.86,y=Math.sin(a)*layout.burstRadius*.57,color=colors[i%3];
      return <Animated.View key={i} style={{position:"absolute",left:layout.end.x-24,top:layout.end.y-24,transform:[{translateX:progress.interpolate({inputRange:[0,start,at,1],outputRange:[0,0,x,x],extrapolate:"clamp"})},{translateY:progress.interpolate({inputRange:[0,start,at,1],outputRange:[0,0,y,y],extrapolate:"clamp"})}]}}>
        <Animated.View style={{opacity:progress.interpolate({inputRange:[0,start,start+.005,at,at+.002,1],outputRange:[0,0,1,1,0,0],extrapolate:"clamp"}),transform:[{rotate:`${a*180/Math.PI+90}deg`}]}}><Svg width={48} height={48} viewBox="0 0 48 48"><Path d="M24 24 L22 45 L26 45Z" fill={color} opacity=".6" /><Circle cx="24" cy="24" r="2" fill={C.white} /></Svg></Animated.View>
        <Animated.View style={{position:"absolute",opacity:progress.interpolate({inputRange:[0,at,at+.008,Math.min(.995,at+.06),1],outputRange:[0,0,.9,0,0],extrapolate:"clamp"}),transform:[{scale:progress.interpolate({inputRange:[0,at,Math.min(.995,at+.06),1],outputRange:[.1,.1,1.5,1.5],extrapolate:"clamp"})}]}}><Svg width={48} height={48} viewBox="-24 -24 48 48"><Path d={Array.from({length:9},(_,n)=>{const a=n*Math.PI*2/9;return `M${Math.cos(a)*13} ${Math.sin(a)*13} l${Math.cos(a)*4} ${Math.sin(a)*4}`;}).join(" ")} stroke={color} strokeWidth="1.4" /></Svg></Animated.View>
      </Animated.View>;
    })}
    <Animated.View style={{position:"absolute",left:layout.end.x-layout.burstRadius,top:layout.end.y-layout.burstRadius*.25,opacity:progress.interpolate({inputRange:[0,J.willow,J.willow+.02,1],outputRange:[0,0,.7,0],extrapolate:"clamp"}),transform:[{translateY:progress.interpolate({inputRange:[0,J.willow,1],outputRange:[0,0,layout.burstRadius*.7],extrapolate:"clamp"})}]}}><Svg width={layout.burstRadius*2} height={layout.burstRadius} viewBox="-100 -50 200 100"><Path d={rain} stroke={C.gold} fill={C.gold} strokeWidth="4" opacity=".12" /><Path d={rain} stroke={C.gold} fill={C.gold} strokeWidth=".8" /></Svg></Animated.View>
    {colors.map((color,i)=><Animated.View key={color} style={{position:"absolute",left:layout.end.x-layout.burstRadius+(i-1)*20,top:layout.end.y-layout.burstRadius+i*15,opacity:progress.interpolate({inputRange:[0,J.afterglow,J.afterglow+.01,1],outputRange:[0,0,.10,0],extrapolate:"clamp"})}}><Svg width={layout.burstRadius*2} height={layout.burstRadius*2} viewBox="0 0 100 100"><Defs><RadialGradient id={`rocket-nebula-${i}`}><Stop stopColor={color} /><Stop offset=".45" stopColor={color} stopOpacity=".3" /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient></Defs><Circle cx="50" cy="50" r="49" fill={`url(#rocket-nebula-${i})`} /></Svg></Animated.View>)}
  </>;
}
