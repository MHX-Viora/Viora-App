import type { CinematicBounds, CinematicQuality } from "./premium-gift-cinematic";

export const ROCKET_ORBITAL_DURATION = 8500;
export const ORBITAL_STOPS = [0,800,1800,3000,4200,5500,7000,8000,8500] as const;
export const ORBITAL_PHASES = ["INTRO","IGNITION","LAUNCH","CLOUD_BREAK","ATMOSPHERE","SPACE","WARP","EXIT"] as const;
export const ORBITAL_COLORS = { white:"#FFF9E3", gold:"#FFD45A", champagne:"#F4CF88", cyan:"#62DEFF", magenta:"#CB68ED", navy:"#080E21", ink:"#02040B" };
export const clamp = (n:number) => Math.max(0,Math.min(1,n));
export const ramp = (p:number,a:number,b:number) => clamp((p-a)/(b-a));
export const smooth = (p:number,a:number,b:number) => {const t=ramp(p,a,b);return t*t*(3-2*t);};
export function orbitalPhase(progress:number) {
  const ms=clamp(progress)*ROCKET_ORBITAL_DURATION;
  let index=0; while(index<7 && ms>=ORBITAL_STOPS[index+1])index++;
  return ORBITAL_PHASES[index];
}
export function orbitalLayout(bounds: Pick<CinematicBounds,"width"|"height">) {
  const {width:w,height:h}=bounds, compact=h<380;
  const cardWidth=Math.min(w-24,compact?w*.46:w*.86,520);
  const cardHeight=compact?56:84;
  return {size:Math.max(24,Math.min(w*.30,h*.31,240)),cardWidth,cardHeight,
    cardTop:Math.min(compact?16:90,h*.16), compact, horizonRadius:Math.max(w*.9,h*.55)};
}
export function orbitalFrame(p:number,reduced=false) {
  p=clamp(p); const ms=p*ROCKET_ORBITAL_DURATION;
  const launch=smooth(ms,1800,3000), escape=smooth(ms,4200,5500), space=smooth(ms,5500,7000), warp=smooth(ms,7000,7880);
  const overlay=smooth(ms,0,600)*(1-smooth(ms,8000,8500));
  if(reduced)return {overlay, x:.5,y:.5,scale:.8,bank:0,pitch:0,shake:0,travel:0,cloud:0,earth:0,space:0,warp:0,ignition:smooth(ms,800,1500),rocket:smooth(ms,800,1500)*(1-smooth(ms,7300,8000)),flash:0};
  return {overlay,x:.5+Math.sin(launch*Math.PI)*.04+space*.045-warp*.045,
    y:.73-launch*.22-escape*.035-warp*.13, scale:(.75+launch*.30-escape*.24-space*.1)*(1-warp),
    bank:-5+launch*10+space*3-warp*8,pitch:14-launch*8+space*3,
    shake:ms>1550&&ms<1850?Math.sin(ms*.08)*Math.sin(ramp(ms,1550,1850)*Math.PI)*2.5:0,
    travel:Math.max(0,(ms-1800)/1200)**1.8,
    cloud:smooth(ms,800,1600)*(1-smooth(ms,3900,5000)),earth:smooth(ms,4200,5500),space:smooth(ms,3800,5700),warp,
    ignition:smooth(ms,800,1800),rocket:smooth(ms,800,1200)*(1-smooth(ms,7750,7960)),
    flash:Math.sin(ramp(ms,3050,3350)*Math.PI)*.7};
}
export function orbitalBudget(quality:CinematicQuality) {
  return quality==="low"?{stars:48,clouds:15,dust:12,dpr:1}:quality==="medium"?{stars:88,clouds:24,dust:24,dpr:1.5}:{stars:150,clouds:36,dust:40,dpr:2};
}
export const orbitalNoise=(i:number,seed=1)=>{const n=Math.sin(i*127.1+seed*311.7)*43758.5453;return n-Math.floor(n);};
const SKY = [[110,207,255],[35,103,178],[18,42,87],[8,14,33],[2,4,11]];
export function orbitalSkyColor(p:number) {
  const position=clamp(p)*(SKY.length-1),i=Math.min(SKY.length-2,Math.floor(position)),t=position-i;
  return `rgb(${SKY[i].map((value,channel)=>Math.round(value+(SKY[i+1][channel]-value)*t)).join(",")})`;
}
