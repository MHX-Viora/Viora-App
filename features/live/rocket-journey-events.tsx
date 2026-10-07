import { useMemo } from "react";
import { Animated } from "react-native";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { ROCKET_COLORS as C, type RocketLayout } from "./premium-gift-rocket-model";
import { JOURNEY as J, rocketGates, rocketJourneyPoint, rocketJourneyBank } from "./rocket-journey-model";
import { RocketGlow } from "./premium-gift-rocket-environment";

export function RocketJourneyEvents({layout,progress,reducedMotion}:SceneProps&{layout:RocketLayout}) {
  const gates=useMemo(()=>rocketGates(layout),[layout]);
  const frames=useMemo(()=>Array.from({length:37},(_,i)=>J.launch+i/36*(J.arrival-J.launch)),[]);
  if(reducedMotion)return null;
  const size=layout.size*.8;
  return <>
    {[C.gold,C.pink,C.cyan].map((color,i)=>{
      const points=frames.map(t=>rocketJourneyPoint(layout,Math.max(J.launch,t-(i+1)*.012)));
      const opacity=progress.interpolate({inputRange:[0,J.boost,J.boost+.015,J.portal,J.arrival,1],outputRange:[0,0,[.3,.15,.05][i],[.2,.10,.04][i],0,0],extrapolate:"clamp"});
      return <Animated.View key={color} style={{position:"absolute",left:-layout.size*.27,top:-layout.size*.5,opacity,transform:[
        {translateX:progress.interpolate({inputRange:[0,...frames,1],outputRange:[points[0].x,...points.map(p=>p.x),points.at(-1)!.x],extrapolate:"clamp"})},
        {translateY:progress.interpolate({inputRange:[0,...frames,1],outputRange:[points[0].y,...points.map(p=>p.y),points.at(-1)!.y],extrapolate:"clamp"})},
        {rotate:progress.interpolate({inputRange:[0,...frames,1],outputRange:["0deg",...frames.map(t=>`${rocketJourneyBank(layout,t)*180/Math.PI}deg`),"0deg"],extrapolate:"clamp"})},
        {scale:progress.interpolate({inputRange:[0,J.boost,J.distance,J.portal,J.arrival,1],outputRange:[1,1,.7,.4,.2,.2],extrapolate:"clamp"})},{scaleY:1.10+i*.13} ]}}>
        <Svg width={layout.size*.54} height={layout.size} viewBox="0 0 100 160"><Path d="M50 1 C20 19 26 51 28 101 L10 136 L35 130 L42 152 L58 152 L65 130 L90 136 L72 101 C74 49 80 19 50 1Z" fill={color} stroke={color} strokeWidth="8" opacity=".3" /><Path d="M50 1 C20 19 26 51 28 101 L10 136 L35 130 L42 152 L58 152 L65 130 L90 136 L72 101 C74 49 80 19 50 1Z" fill={color} /></Svg>
      </Animated.View>;
    })}
    {gates.map((g,i)=><Animated.View key={g.at} style={{position:"absolute",left:g.point.x-size/2,top:g.point.y-size/2,opacity:progress.interpolate({inputRange:[0,g.at-.045,g.at-.02,g.at,g.at+.008,g.at+.075,1],outputRange:[0,0,.28,.55,.95,0,0],extrapolate:"clamp"}),transform:[{rotate:`${g.rotation}deg`},{scale:progress.interpolate({inputRange:[0,g.at-.045,g.at-.02,g.at,g.at+.075,1],outputRange:[.3,.3,.8,1,2.2,2.2],extrapolate:"clamp"})}]}}>
      <Svg width={size} height={size} viewBox="0 0 100 100"><Ellipse cx="50" cy="50" rx="40" ry="22" stroke={g.color} strokeWidth="10" opacity=".12" fill="none" /><Ellipse cx="50" cy="50" rx="40" ry="22" stroke={g.color} strokeWidth="2.3" strokeDasharray={`${18+i*3} 5 4 3`} fill="none" /><Ellipse cx="50" cy="50" rx="34" ry="17" stroke={C.white} strokeWidth=".8" opacity=".65" fill="none" /></Svg>
    </Animated.View>)}
    <JourneyWings layout={layout} progress={progress} />
    <JourneyPortal layout={layout} progress={progress} />
    <Animated.View style={{position:"absolute",left:gates[2].point.x-size,top:gates[2].point.y-size,opacity:progress.interpolate({inputRange:[0,J.sonic,J.sonic+.006,J.sonic+.05,1],outputRange:[0,0,.7,0,0],extrapolate:"clamp"}),transform:[{scale:progress.interpolate({inputRange:[0,J.sonic,J.sonic+.06,1],outputRange:[.12,.12,1.6,1.6],extrapolate:"clamp"})}]}}>
      <Svg width={size*2} height={size*2} viewBox="0 0 100 100"><Defs><RadialGradient id="sonicRocket"><Stop stopColor={C.white} stopOpacity=".8" /><Stop offset=".3" stopColor={C.cyan} stopOpacity=".08" /><Stop offset=".8" stopColor={C.pink} stopOpacity=".16" /><Stop offset="1" stopColor={C.pink} stopOpacity="0" /></RadialGradient></Defs><Circle cx="50" cy="50" r="49" fill="url(#sonicRocket)" /><Circle cx="50" cy="50" r="35" stroke={C.cyan} strokeWidth="1.5" fill="none" /></Svg>
    </Animated.View>
  </>;
}

function JourneyWings({layout,progress}:Pick<SceneProps,"progress">&{layout:RocketLayout}) {
  const point=rocketJourneyPoint(layout,J.boost),size=layout.size*1.8;
  return <Animated.View style={{position:"absolute",left:point.x-size/2,top:point.y-size/2,opacity:progress.interpolate({inputRange:[0,J.boost,J.boost+.015,J.boost+.065,1],outputRange:[0,0,.85,0,0],extrapolate:"clamp"}),transform:[{rotate:`${rocketJourneyBank(layout,J.boost)*180/Math.PI}deg`},{scaleY:progress.interpolate({inputRange:[0,J.boost,J.boost+.065,1],outputRange:[.5,.5,1.8,1.8],extrapolate:"clamp"})}]}}>
    <Svg width={size} height={size} viewBox="0 0 200 200">{[C.gold,C.cyan,C.pink].map((c,i)=><Path key={c} d={`M100 104 Q${25-i*5} ${110+i*10} ${7+i*7} ${40+i*12} M100 104 Q${175+i*5} ${110+i*10} ${193-i*7} ${40+i*12}`} stroke={c} strokeWidth={i===0?3:1.5} opacity={1-i*.2} fill="none" />)}</Svg>
  </Animated.View>;
}
function JourneyPortal({layout,progress}:Pick<SceneProps,"progress">&{layout:RocketLayout}) {
  const r=Math.min(layout.size*.68,layout.burstRadius*.80),{x,y}=layout.end;
  return <>
    {[C.gold,C.pink,C.cyan].map((color,i)=><Animated.View key={color} style={{position:"absolute",left:x-r,top:y-r,opacity:progress.interpolate({inputRange:[0,J.portal,J.portal+.018,J.arrival-.006,J.arrival,1],outputRange:[0,0,.85,.6,0,0],extrapolate:"clamp"}),transform:[{scale:progress.interpolate({inputRange:[0,J.portal,J.portal+.02,J.arrival-.01,J.arrival,1],outputRange:[.5,.5,1,.35,.03,.03],extrapolate:"clamp"})},{rotate:progress.interpolate({inputRange:[0,1],outputRange:["0deg",`${i%2?-680:540}deg`]})}]}}>
      <Svg width={r*2} height={r*2} viewBox="0 0 200 200"><Circle cx="100" cy="100" r={86-i*19} stroke={color} strokeWidth="9" opacity=".12" fill="none" /><Circle cx="100" cy="100" r={86-i*19} stroke={color} strokeWidth="2" strokeDasharray="28 7 5 11" fill="none" /></Svg>
    </Animated.View>)}
    <Animated.View style={{position:"absolute",left:x-10,top:y-10,opacity:progress.interpolate({inputRange:[0,J.arrival-.003,J.arrival,J.burst,J.burst+.001,1],outputRange:[0,0,1,1,0,0],extrapolate:"clamp"})}}><RocketGlow size={20} color={C.white} white /><Svg width={20} height={20} style={{position:"absolute"}}><Circle cx="10" cy="10" r="2" fill={C.white} /></Svg></Animated.View>
  </>;
}
