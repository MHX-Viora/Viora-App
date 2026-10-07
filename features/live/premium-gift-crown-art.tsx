import { memo, useId } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";
import { CROWN_BAND, CROWN_FOOT, CROWN_PROFILE, ROYAL_GOLD } from "./premium-gift-crown-model";

/** Authored metal surfaces: rear rim, five faceted points, curved front band and raised settings. */
export const RoyalCrownArt = memo(function RoyalCrownArt({ width, outline = false, sweep }: { width: number; outline?: boolean; sweep?: number }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = `royal-${instance}-${outline ? "trace" : sweep !== undefined ? `sweep${sweep}` : "metal"}`;
  const fill = (name: string) => `url(#${id}-${name})`;
  if (outline) return <Svg width={width} height={width * .75} viewBox="0 0 400 300">
    <Path d={CROWN_PROFILE} fill="none" stroke={ROYAL_GOLD.champagne} strokeWidth={2} />
    <Path d={CROWN_BAND} fill="none" stroke={ROYAL_GOLD.highlight} strokeWidth={2.4} />
    <Path d="M37 251 Q200 296 363 251" fill="none" stroke={ROYAL_GOLD.gold} strokeWidth={1} />
  </Svg>;
  if (sweep !== undefined) {
    const x = -110 + sweep * 62;
    return <Svg width={width} height={width * .75} viewBox="0 0 400 300"><Defs>
      <LinearGradient id={`${id}-shine`} gradientUnits="userSpaceOnUse" x1={x} x2={x + 100} y1="70" y2="115">
        <Stop offset="0" stopColor={ROYAL_GOLD.highlight} stopOpacity="0" /><Stop offset="0.35" stopColor={ROYAL_GOLD.champagne} stopOpacity="0.13" /><Stop offset="0.52" stopColor="#FFFFFF" stopOpacity="0.72" /><Stop offset="0.72" stopColor={ROYAL_GOLD.highlight} stopOpacity="0.16" /><Stop offset="1" stopColor={ROYAL_GOLD.highlight} stopOpacity="0" />
      </LinearGradient>
    </Defs><Path d={CROWN_PROFILE} fill={fill("shine")} /><Path d={CROWN_BAND} fill={fill("shine")} /><Path d={CROWN_FOOT} fill={fill("shine")} /></Svg>;
  }
  return <Svg width={width} height={width * .75} viewBox="0 0 400 300"><Defs>
    <LinearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="0.12">
      {["#42270C", "#B48128", "#F4C95D", "#FFF7D6", "#A16D17", "#EDC467", "#FFEDBB", "#AE791E", "#E9B951", "#64400E"].map((color,i)=><Stop key={i} offset={i/9} stopColor={color} />)}
    </LinearGradient>
    <LinearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor="#FEEDBC" /><Stop offset="0.17" stopColor="#9C691C" /><Stop offset="0.30" stopColor="#DFAE43" /><Stop offset="0.55" stopColor="#FFE0A0" /><Stop offset="0.71" stopColor="#BD8A29" /><Stop offset="1" stopColor="#54350D" />
    </LinearGradient>
    <LinearGradient id={`${id}-bevel`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF5CD" /><Stop offset=".43" stopColor="#D6A72C" /><Stop offset="1" stopColor="#66450F" /></LinearGradient>
    <LinearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FBDA86" /><Stop offset=".35" stopColor="#6C440B" /><Stop offset=".72" stopColor="#E0B354" /><Stop offset="1" stopColor="#3B230C" /></LinearGradient>
    <RadialGradient id={`${id}-velvet`}><Stop offset="0" stopColor="#48262A" /><Stop offset="1" stopColor="#140E10" /></RadialGradient>
  </Defs>
    <Ellipse cx="200" cy="207" rx="167" ry="44" fill={fill("velvet")} stroke="#6D4714" strokeWidth="6" />
    <Path d="M52 198 L61 107 L127 150 L164 78 L200 145 L236 78 L273 150 L339 107 L348 198 Q200 151 52 198Z" fill="#77521A" stroke="#B08B43" strokeWidth="1.5" />
    <Path d={CROWN_PROFILE} fill={fill("gold")} stroke="#FFF0BC" strokeWidth="1.8" />
    <Path d="M36 210 L20 85 L39 112 L67 206Z M364 210 L380 85 L361 112 L333 206Z" fill="#69430F" opacity=".78" />
    <Path d="M90 135 L112 45 L120 76 L120 205 L82 208Z M246 132 L288 45 L291 74 L275 207 L241 213Z" fill={fill("bevel")} />
    <Path d="M154 132 L200 18 L182 215 L138 212Z" fill={fill("bevel")} />
    <Path d="M200 18 L246 132 L262 211 L213 216Z" fill="#AC7822" opacity=".56" />
    <Path d="M195 42 L200 22 L212 212 L196 215Z" fill="#FFF5CB" opacity=".45" />
    <Path d="M23 89 L90 137 L112 48 L154 135 L200 22 L246 135 L288 48 L310 137 L377 89" fill="none" stroke="#FFF4C8" strokeWidth="2.2" />
    <Path d="M39 202 Q200 246 361 202" fill="none" stroke="#71450D" strokeWidth="9" />
    <Path d={CROWN_FOOT} fill={fill("rim")} stroke="#AC7A26" strokeWidth="1.4" />
    <Path d={CROWN_BAND} fill={fill("band")} stroke="#F8DB8C" strokeWidth="2" />
    <Path d="M39 207 Q200 260 361 207" fill="none" stroke="#FFF2C1" strokeWidth="3.3" />
    <Path d="M40 250 Q200 293 360 250" fill="none" stroke="#3D260D" strokeWidth="4" />
    <Path d="M43 254 Q200 296 357 254" fill="none" stroke="#F6D488" strokeWidth="1.7" />
    {Array.from({length:19},(_,i)=>{
      const x=52+i*16.5; const y=213+24*Math.sin((x-36)/328*Math.PI);
      return <G key={i}><Circle cx={x} cy={y} r="2.6" fill="#6F4A13" /><Circle cx={x-.6} cy={y-.6} r="1.6" fill="#FFF0B5" /></G>;
    })}
    {[74,151,249,326].map((x,i)=><G key={x}>
      <Path d={`M${x} ${i===0||i===3?236:247} q-9 -12 -16 -5 q-3 9 10 10 q-12 2 -8 9 q8 6 14 -7 q6 13 14 7 q4 -7 -8 -9 q13 -1 10 -10 q-7 -7 -16 5Z`} fill="none" stroke="#7E5419" strokeWidth="1.7" />
      <Path d={`M${x} ${i===0||i===3?230:241} v15`} stroke="#FFE8A8" strokeWidth="1" />
    </G>)}
    {[{x:120,y:237,r:11},{x:200,y:244,r:20},{x:280,y:237,r:11}].map(({x,y,r})=><Diamond key={x} x={x} y={y} r={r} />)}
    {[{x:20,y:85},{x:112,y:45},{x:200,y:18},{x:288,y:45},{x:380,y:85}].map(({x,y},i)=><G key={x}>
      <Circle cx={x+1} cy={y+2} r={i===2?8:6} fill="#59380D" />
      <Circle cx={x} cy={y} r={i===2?7:5} fill={fill("bevel")} stroke="#FFEFC4" strokeWidth="1" />
      <Circle cx={x-1.4} cy={y-1.5} r="1.7" fill="#FFFFFF" opacity=".88" />
    </G>)}
  </Svg>;
});

function Diamond({x,y,r}:{x:number;y:number;r:number}) {
  return <G><Ellipse cx={x+1} cy={y+2} rx={r+5} ry={r+3} fill="#56350F" /><Path d={`M${x} ${y-r-3} L${x+r+3} ${y} L${x} ${y+r+3} L${x-r-3} ${y}Z`} fill="#D6A72C" stroke="#FFF1C2" strokeWidth="2" />
    <Path d={`M${x} ${y-r} L${x+r} ${y} L${x} ${y+r} L${x-r} ${y}Z`} fill="#806B48" />
    <Path d={`M${x} ${y-r} L${x} ${y} L${x-r} ${y}Z`} fill="#FFFBEB" />
    <Path d={`M${x} ${y-r} L${x+r} ${y} L${x} ${y}Z`} fill="#E8D8B6" />
    <Path d={`M${x-r} ${y} L${x} ${y} L${x} ${y+r}Z`} fill="#BAA683" />
    <Path d={`M${x} ${y} L${x+r} ${y} L${x} ${y+r}Z`} fill="#5C5849" />
    <Path d={`M${x} ${y-r*.48} L${x+r*.44} ${y} L${x} ${y+r*.5} L${x-r*.44} ${y}Z`} fill="#FFF6DD" stroke="#FFFCEF" strokeWidth=".8" />
  </G>;
}
