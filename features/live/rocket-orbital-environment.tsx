import { memo, useId, useMemo } from "react";
import { Animated, StyleSheet } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { orbitalLayout, orbitalNoise as noise, ORBITAL_COLORS as C } from "./rocket-orbital-model";

// Bounded SVG planes on mobile; transforms and opacity run on the native driver.
export const RocketOrbitalEnvironment=memo(function RocketOrbitalEnvironment({bounds,progress,reducedMotion,quality}:SceneProps){
  const {width:w,height:h}=bounds,l=orbitalLayout(bounds),id=useId().replace(/\W/g,"");
  const v=(ms:number[],values:number[])=>progress.interpolate({inputRange:ms.map(x=>x/8500),outputRange:values,extrapolate:"clamp"});
  const overlay=v([0,600,8000,8500],[0,1,1,0]);
  const stars=useMemo(()=>[0,1,2].map(depth=>Array.from({length:quality==="low"?12:22},(_,i)=>{
    const x=noise(i+depth*40,30)*w,y=noise(i+depth*40,32)*h,s=.7+depth*.6;
    return `M${x} ${y}h${s}v${s}h-${s}Z`;
  }).join(" ")),[w,h,quality]);
  const warpLines=useMemo(()=>Array.from({length:quality==="low"?12:24},(_,i)=>{
    const x=noise(i,40)*w,y=noise(i,41)*h,dx=x-w*.5,dy=y-h*.35;
    return `M${x} ${y}l${dx*.13} ${dy*.13}`;
  }).join(" "),[w,h,quality]);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject,{opacity:overlay}]}>
    <Animated.View style={[StyleSheet.absoluteFillObject,{backgroundColor:C.ink,opacity:reducedMotion?.24:v([0,1800,3300,8000,8500],[.15,.35,.97,.97,0])}]} />
    {!reducedMotion?<>
      <Animated.View style={[StyleSheet.absoluteFillObject,{opacity:v([0,1800,3000,4200,5500],[0,0,.7,.35,0])}]}><Svg width={w} height={h}><Defs><LinearGradient id={`${id}sky`} x2="0" y2="1"><Stop stopColor="#122A57"/><Stop offset="1" stopColor="#6ECFFF"/></LinearGradient></Defs><Rect width={w} height={h} fill={`url(#${id}sky)`}/></Svg></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject,{opacity:v([0,4200,5500,8000,8500],[0,0,1,1,0]),transform:[{translateY:v([0,4200,5500,8000],[h*.30,h*.30,0,h*.04])}]}]}>
        <Svg width={w} height={h}><Defs>
          <RadialGradient id={`${id}earth`} cx="35%" cy="15%"><Stop stopColor="#4C99B8"/><Stop offset=".5" stopColor="#164063"/><Stop offset="1" stopColor="#020717"/></RadialGradient>
          <RadialGradient id={`${id}nebula`}><Stop stopColor="#8D6AB7" stopOpacity=".25"/><Stop offset="1" stopColor="#4D2394" stopOpacity="0"/></RadialGradient>
        </Defs><Ellipse cx={w*.75} cy={h*.35} rx={w*.5} ry={h*.20} fill={`url(#${id}nebula)`}/>
          <G transform={`rotate(-25 ${w*.87} ${h*.15})`}><Ellipse cx={w*.87} cy={h*.15} rx={w*.11} ry={w*.035} stroke="#7E84AC" strokeWidth="2" fill="none"/></G><Circle cx={w*.87} cy={h*.15} r={w*.055} fill="#313B5E"/>
          <Circle cx={w*.5} cy={h*.70+l.horizonRadius} r={l.horizonRadius} fill={`url(#${id}earth)`} stroke="#69CBFF" strokeWidth="4"/>
          <Path d={`M${w*.05},${h*.90} Q${w*.22},${h*.71} ${w*.40},${h*.83} T${w*.67},${h*.94}`} stroke="#4C665F" strokeWidth={h*.08} fill="none" opacity=".5"/>
          <Path d={`M0,${h*.89} Q${w*.5},${h*.49} ${w},${h*.89}`} stroke="#9DEAFF" strokeWidth="1.5" fill="none" opacity=".75"/>
        </Svg>
      </Animated.View>
      {stars.map((path,depth)=><Animated.View key={depth} style={[StyleSheet.absoluteFillObject,{opacity:v([0,3800,5500,8000,8500],[0,0,.25+depth*.2,.25+depth*.2,0]),transform:[{translateY:v([0,3800,7000,8000],[0,0,h*.02*(depth+1),h*.08*(depth+1)])}]}]}><Svg width={w} height={h}><Path d={path} fill={C.white}/></Svg></Animated.View>)}
      <Animated.View style={[StyleSheet.absoluteFillObject,{opacity:v([0,7000,7600,8000,8300],[0,0,.6,.6,0]),transform:[{scale:v([0,7000,8000],[1,1,1.25])}]}]}><Svg width={w} height={h}><Path d={warpLines} stroke={C.cyan} strokeWidth="1.2" fill="none"/></Svg></Animated.View>
      {[0,1,2].map(depth=><Animated.View key={`cloud-${depth}`} style={[StyleSheet.absoluteFillObject,{opacity:v([0,800,1500,3500,4700],[0,0,.45+depth*.2,.45+depth*.2,0]),transform:[{translateY:v([0,1800,3000,4200],[h*.5,h*.5,h*.05,h*(.55+depth*.3)])},{scaleX:v([0,2900,3800,8500],[1,1,1.9,1.9])}]}]}><Svg width={w} height={h}><Defs><RadialGradient id={`${id}cloud${depth}`}><Stop stopColor="#FFF1DA"/><Stop offset=".4" stopColor="#D8D5E0" stopOpacity=".85"/><Stop offset="1" stopColor="#6381B3" stopOpacity="0"/></RadialGradient></Defs><G>{Array.from({length:6},(_,i)=><Ellipse key={i} cx={w*(i%2?.78:.22)+noise(i+depth*12,2)*w*.18} cy={h*(.15+noise(i+depth*12,3)*.30)} rx={w*(.25+noise(i,4)*.2)} ry={h*.20} fill={`url(#${id}cloud${depth})`}/>)}</G></Svg></Animated.View>)}
      <Animated.View style={[StyleSheet.absoluteFillObject,{backgroundColor:"#F2F7FF",opacity:v([0,3050,3200,3350,8500],[0,0,.45,0,0])}]} />
      <Animated.View style={{position:"absolute",left:w*.5-12,top:h*.345-12,width:24,height:24,opacity:v([0,7850,8000,8170,8500],[0,0,1,0,0]),transform:[{scale:v([0,7850,8000,8170],[.1,.1,1.8,.1])}]}}><Svg width="24" height="24"><Path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z" fill={C.white}/></Svg></Animated.View>
    </>:null}
  </Animated.View>;
});
