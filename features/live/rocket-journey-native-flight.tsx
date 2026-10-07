import { useMemo } from "react";
import { Animated } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { ROCKET_COLORS as C, type RocketLayout } from "./premium-gift-rocket-model";
import { rocketJourneyPoint, rocketJourneyBank, rocketArcWindows, rocketJourneyBudget, JOURNEY as J } from "./rocket-journey-model";

export function RocketNativeSupport({layout,progress,effect,quality}:SceneProps&{layout:RocketLayout}) {
  const budget=rocketJourneyBudget(quality);
  const times=useMemo(()=>[0,...Array.from({length:33},(_,i)=>J.launch+i/32*(J.arrival-J.launch)),1],[]);
  const points=useMemo(()=>times.map(t=>rocketJourneyPoint(layout,t)),[layout,times]);
  const arc=useMemo(()=>{
    const windows=rocketArcWindows(effect.durationMs);return {times:[0,...windows.flatMap(w=>[w.start,w.start+.001,w.end]),1],opacity:[0,...windows.flatMap(()=>[0,.8,0]),0]};
  },[effect.durationMs]);
  const position=[{translateX:progress.interpolate({inputRange:times,outputRange:points.map(p=>p.x),extrapolate:"clamp"})},{translateY:progress.interpolate({inputRange:times,outputRange:points.map(p=>p.y),extrapolate:"clamp"})},{rotate:progress.interpolate({inputRange:times,outputRange:times.map(t=>`${rocketJourneyBank(layout,Math.min(t,J.arrival-.001))*180/Math.PI}deg`),extrapolate:"clamp"})}];
  const size=layout.size*2;
  return <>
    <Animated.View style={{position:"absolute",left:-size/2,top:-size/2,opacity:progress.interpolate({inputRange:[0,J.boost,J.boost+.035,J.portal,J.arrival,1],outputRange:[0,0,.6,.6,0,0],extrapolate:"clamp"}),transform:[...position,{scaleY:progress.interpolate({inputRange:[0,J.boost,J.portal,1],outputRange:[.5,.5,1.6,1.6],extrapolate:"clamp"})}]}}>
      <Svg width={size} height={size} viewBox="-100 -100 200 200">{[C.white,C.gold,C.cyan,C.pink].map((c,i)=><Path key={c} d={Array.from({length:6},(_,n)=>{const side=n%2?-1:1,x=side*(32+n*7+i*3),y=-66+n*22;return `M${x} ${y} l${side*6} ${25+i*8}`;}).join(" ")} fill="none" stroke={c} strokeWidth={i?1:1.8} opacity={i?.4:.7} />)}</Svg>
    </Animated.View>
    <Animated.View style={{position:"absolute",left:-layout.size*.5,top:-layout.size*.5,opacity:progress.interpolate({inputRange:arc.times,outputRange:arc.opacity,extrapolate:"clamp"}),transform:position}}>
      <Svg width={layout.size} height={layout.size} viewBox="-50 -50 100 100"><Path d="M-36 -4 L-21 -9 L-26 5 L-12 1 L0 12 M5 14 L18 27 L14 37 L32 28 M-5 -19 L11 -28 L8 -15 L23 -21" stroke={C.cyan} strokeWidth="4" opacity=".15" fill="none" /><Path d="M-36 -4 L-21 -9 L-26 5 L-12 1 L0 12 M5 14 L18 27 L14 37 L32 28 M-5 -19 L11 -28 L8 -15 L23 -21" stroke={C.white} strokeWidth=".7" fill="none" /></Svg>
    </Animated.View>
    {Array.from({length:budget.comets},(_,i)=>{
      const start=J.launch+.065+i*.035,end=start+.075,a=rocketJourneyPoint(layout,start),b=rocketJourneyPoint(layout,end),side=i%2?-1:1;
      return <Animated.View key={i} style={{position:"absolute",left:a.x+side*layout.size*.65,top:a.y,opacity:progress.interpolate({inputRange:[0,start,start+.01,end,end+.02,1],outputRange:[0,0,.75,.4,0,0],extrapolate:"clamp"}),transform:[{translateX:progress.interpolate({inputRange:[0,start,end,1],outputRange:[0,0,b.x-a.x,b.x-a.x],extrapolate:"clamp"})},{translateY:progress.interpolate({inputRange:[0,start,end,1],outputRange:[0,0,b.y-a.y,b.y-a.y],extrapolate:"clamp"})},{rotate:`${rocketJourneyBank(layout,start)*180/Math.PI}deg`}]}}>
        <Svg width={layout.size*.09} height={layout.size*.28} viewBox="0 0 12 40"><Path d="M6 3 L4 31 L6 40 L8 31Z" fill={[C.gold,C.cyan,C.pink][i%3]} opacity=".4" /><Path d="M6 0 L9 6 L6 10 L3 6Z" fill={C.white} /></Svg>
      </Animated.View>;
    })}
    <NativeSonicSparks layout={layout} progress={progress} count={budget.sparks} />
  </>;
}

function NativeSonicSparks({layout,progress,count}:Pick<SceneProps,"progress">&{layout:RocketLayout;count:number}) {
  const p=rocketJourneyPoint(layout,J.sonic),size=layout.size*2.2;
  const path=Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count,x=Math.cos(a)*70,y=Math.sin(a)*70;return `M${x} ${y} l${Math.cos(a)*5} ${Math.sin(a)*5}`;}).join(" ");
  return <Animated.View style={{position:"absolute",left:p.x-size/2,top:p.y-size/2,opacity:progress.interpolate({inputRange:[0,J.sonic,J.sonic+.01,J.sonic+.075,1],outputRange:[0,0,.8,0,0],extrapolate:"clamp"}),transform:[{scale:progress.interpolate({inputRange:[0,J.sonic,J.sonic+.075,1],outputRange:[.1,.1,1.6,1.6],extrapolate:"clamp"})}]}}><Svg width={size} height={size} viewBox="-100 -100 200 200"><Path d={path} stroke={C.cyan} strokeWidth="5" opacity=".12" /><Path d={path} stroke={C.white} strokeWidth="1" /></Svg></Animated.View>;
}
