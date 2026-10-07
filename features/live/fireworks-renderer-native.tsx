import { useMemo } from "react";
import { Animated } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { FIREWORK_COLORS as C, fireworksPlan, fireworksParticles, fireworksCohortPath, fireworksProjectile, fireworksRadius, type FireworksBurst } from "./fireworks-show-model";

function Bloom({size,color,id}:{size:number;color:string;id:string}) {
  return <Svg width={size} height={size} viewBox="0 0 100 100"><Defs><RadialGradient id={id}><Stop stopColor={C.white} /><Stop offset=".15" stopColor={color} stopOpacity=".8" /><Stop offset=".5" stopColor={color} stopOpacity=".18" /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient></Defs><Circle cx="50" cy="50" r="49" fill={`url(#${id})`} /></Svg>;
}

export function NativeFireworksRenderer(props:SceneProps&{show?:readonly FireworksBurst[]}) {
  const show=useMemo(()=>(props.show??fireworksPlan(props.quality,props.effect.variant ?? 0)).filter(b=>!props.reducedMotion||b.id===0),[props.quality,props.reducedMotion,props.show,props.effect.variant]);
  return <>{show.map(b=><NativeBurst key={b.id} {...props} burst={b} />)}</>;
}

function NativeBurst({bounds,progress,reducedMotion,burst:b}:SceneProps&{burst:FireworksBurst}) {
  const particles=useMemo(()=>fireworksParticles(b),[b]);
  const cohorts=useMemo(()=>Array.from({length:reducedMotion?3:6},(_,i)=>{
    const points=particles.filter((_,n)=>n%6===i);return {path:fireworksCohortPath(points),color:reducedMotion?C.gold:b.palette[i%3],depth:i<3?.6:1,life:Math.min(.97-b.at-i%3*.0133,points[0]?.life??.25),gravity:points[0]?.gravity??.4};
  }),[b,particles,reducedMotion]);
  const r=fireworksRadius(bounds,b),cx=b.x*bounds.width,cy=b.y*bounds.height;
  const opacity=progress.interpolate({inputRange:[0,b.at-.022,b.at,b.at+.04,1],outputRange:[0,0,reducedMotion?.3:1,0,0],extrapolate:"clamp"});
  const trajectory=useMemo(()=>Array.from({length:15},(_,i)=>fireworksProjectile(b,i/14)),[b]);
  const time=[0,...trajectory.map((_,i)=>Math.max(0,b.launch)+i/14*(b.at-.022-Math.max(0,b.launch))),b.at,1];
  const x=[trajectory[0].x*bounds.width,...trajectory.map(p=>p.x*bounds.width),cx,cx],y=[trajectory[0].y*bounds.height,...trajectory.map(p=>p.y*bounds.height),cy,cy];
  const glowSize=r*.65;
  return <>
    {b.launch>=0?<Animated.View style={{position:"absolute",left:-18,top:-18,opacity:progress.interpolate({inputRange:[0,b.launch,b.launch+.008,b.at-.005,b.at,1],outputRange:[0,0,1,1,0,0],extrapolate:"clamp"}),transform:[{translateX:progress.interpolate({inputRange:time,outputRange:x,extrapolate:"clamp"})},{translateY:progress.interpolate({inputRange:time,outputRange:y,extrapolate:"clamp"})},{scale:progress.interpolate({inputRange:[0,b.at-.022,b.at,1],outputRange:[1,1,1.8,1.8],extrapolate:"clamp"})}]}}>
      <Bloom size={36} color={C.gold} id={`projectile-v6-${b.id}`} />
      <Svg width={36} height={Math.min(bounds.height*.20,130)} style={{position:"absolute",left:0,top:18}} viewBox="0 0 36 130"><Defs><LinearGradient id={`trail-v6-${b.id}`} x1="0" y1="0" x2="0" y2="1"><Stop stopColor={C.white} /><Stop offset=".18" stopColor={C.gold} /><Stop offset=".45" stopColor={C.orange} stopOpacity=".8" /><Stop offset=".70" stopColor={C.magenta} stopOpacity=".4" /><Stop offset="1" stopColor={C.magenta} stopOpacity="0" /></LinearGradient></Defs><Path d="M13 0 Q8 23 16 55 Q12 89 18 130 Q22 90 21 54 Q28 18 23 0Z" fill={`url(#trail-v6-${b.id})`} /><Path d="M18 0 Q13 25 18 61 L18 117" stroke={`url(#trail-v6-${b.id})`} strokeWidth="1.5" fill="none" /><Circle cx="8" cy="35" r="1.2" fill={C.gold} /><Circle cx="26" cy="68" r="1" fill={C.magenta} /></Svg>
    </Animated.View>:null}
    <Animated.View style={{position:"absolute",left:cx-glowSize/2,top:cy-glowSize/2,opacity}}><Bloom size={glowSize} color={C.champagne} id={`core-v6-${b.id}`} /></Animated.View>
    {cohorts.map((cohort,i)=>{
      const start=b.at+i%3*.0133,life=cohort.life;
      const samples=Array.from({length:17},(_,n)=>n/16);
      const range=[0,...samples.map(t=>start+t*life),1];
      const travel=samples.map(t=>(1-Math.exp(-2.8*t*1.8))/2.8*2.7);
      const gravity=samples.map(t=>cohort.gravity*(t*1.8-(1-Math.exp(-2.8*t*1.8))/2.8)/2.8*r*.9);
      const alpha=samples.map(t=>t===0||t===1?0:Math.min(1,t*22)*Math.min(1,(1-t)*4)*(t>.6?.35+.65*Math.sin(t*43+i)**2:1)*cohort.depth);
      return <Animated.View key={i} style={{position:"absolute",left:cx-r,top:cy-r,opacity:progress.interpolate({inputRange:range,outputRange:[0,...alpha,0],extrapolate:"clamp"}),transform:[{translateY:progress.interpolate({inputRange:range,outputRange:[0,...gravity,gravity.at(-1)!],extrapolate:"clamp"})},{scale:progress.interpolate({inputRange:range,outputRange:[.01,...travel.map(t=>Math.max(.01,t)),travel.at(-1)!],extrapolate:"clamp"})},{rotate:progress.interpolate({inputRange:[0,start,1],outputRange:["0deg","0deg",`${i%2?9:-9}deg`],extrapolate:"clamp"})}]}}>
        <Svg width={r*2} height={r*2} viewBox="-100 -100 200 200"><Path d={cohort.path} fill={cohort.color} stroke={cohort.color} strokeWidth="6" opacity=".10" /><Path d={cohort.path} fill={cohort.color} /><Path d={cohort.path} fill="none" stroke={C.white} strokeWidth=".3" opacity=".7" /></Svg>
      </Animated.View>;
    })}
    {!reducedMotion?[0,1,2].map(i=>{
      const at=b.at+i*.0133;return <Animated.View key={i} style={{position:"absolute",left:cx-r,top:cy-r,opacity:progress.interpolate({inputRange:[0,at,at+.02,at+.14,1],outputRange:[0,0,.3,0,0],extrapolate:"clamp"}),transform:[{scale:progress.interpolate({inputRange:[0,at,at+.10,1],outputRange:[.02,.02,.45+i*.2,.45+i*.2],extrapolate:"clamp"})}]}}><Svg width={r*2} height={r*2} viewBox="0 0 200 200"><Circle cx="100" cy="100" r="88" fill="none" stroke={b.palette[i]} strokeWidth={i===0?2:1} /></Svg></Animated.View>;
    }):null}
    {b.pattern==="willow"&&!reducedMotion?<Animated.View style={{position:"absolute",left:cx-r,top:cy-r,opacity:progress.interpolate({inputRange:[0,b.at+.07,b.at+.13,Math.max(.90,b.at+.14),1],outputRange:[0,0,.65,.2,0],extrapolate:"clamp"}),transform:[{scale:progress.interpolate({inputRange:[0,b.at+.07,Math.min(.98,b.at+.20),1],outputRange:[.1,.1,1,1],extrapolate:"clamp"})},{translateY:progress.interpolate({inputRange:[0,b.at+.07,1],outputRange:[0,0,r*.20],extrapolate:"clamp"})}]}}>
      <Svg width={r*2} height={r*2} viewBox="-100 -100 200 200"><Path d={Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,x=Math.cos(a)*75,y=Math.sin(a)*55;return `M0 0 Q${x*.85} ${y-12} ${x} ${y+34} Q${x*1.05} ${y+47} ${x*.95} ${y+68}`;}).join(" ")} stroke={C.gold} strokeWidth="4" opacity=".12" fill="none" /><Path d={Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,x=Math.cos(a)*75,y=Math.sin(a)*55;return `M0 0 Q${x*.85} ${y-12} ${x} ${y+34} Q${x*1.05} ${y+47} ${x*.95} ${y+68}`;}).join(" ")} stroke={C.champagne} strokeWidth=".8" fill="none" /></Svg>
    </Animated.View>:null}
    {b.pattern==="willow"&&!reducedMotion?<Animated.View style={{position:"absolute",left:cx-r,top:cy-r,opacity:progress.interpolate({inputRange:[0,b.at+.10,Math.max(.82,b.at+.115),Math.max(.90,b.at+.135),1],outputRange:[0,0,.12,.08,0],extrapolate:"clamp"})}}><Bloom size={r*2} color={C.gold} id={`afterglow-v6-${b.id}`} /></Animated.View>:null}
  </>;
}
