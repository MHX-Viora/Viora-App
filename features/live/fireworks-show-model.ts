import type { CinematicQuality } from "./premium-gift-cinematic";

export const FIREWORK_COLORS = { white: "#FFFFFF", champagne: "#FFE29A", gold: "#FFD166", orange: "#FF9F1C", pink: "#FF3D71", magenta: "#FF4FD8", purple: "#A855F7", cyan: "#00D9FF", blue: "#3D7BFF" } as const;
const C = FIREWORK_COLORS;
export type FireworksPattern = "chrysanthemum" | "star" | "ring" | "willow";
export type FireworksBurst = { id: number; stage: "opening" | "secondary" | "finale-side" | "finale-center" | "background"; pattern: FireworksPattern; x: number; y: number; launch: number; at: number; radius: number; count: number; palette: readonly string[] };
const palettes = [[C.white,C.gold,C.orange], [C.magenta,C.purple,C.gold], [C.cyan,C.blue,C.white], [C.gold,C.magenta,C.cyan]];
export const fireworkNoise = (seed: number, channel: number) => { const n = Math.sin(seed * 19.31 + channel * 73.17) * 43758.5453; return n - Math.floor(n); };

export function fireworksPlan(quality: CinematicQuality, variant = 0): FireworksBurst[] {
  const count = {low:28,medium:48,high:66,ultra:80}[quality];
  const show: FireworksBurst[] = ["chrysanthemum","star","ring","willow"].map((pattern, i) => ({id:i,stage:"opening",pattern:pattern as FireworksPattern,x:[.27,.5,.75,.58][i],y:[.30,.22,.31,.28][i],launch:.04+i*.035,at:.26+i*.035,radius:i===3?.32:.29,count,palette:palettes[i]}));
  show.push(...[0,1,2].map(i => ({id:4+i,stage:(i===2?"finale-center":"finale-side") as FireworksBurst["stage"],pattern:(i===2?"willow":i?"ring":"star") as FireworksPattern,x:[.23,.77,.5][i],y:[.33,.33,.30][i],launch:i===2?.55:.52,at:i===2?.653:.62,radius:i===2?.40:.22,count:i===2?Math.round(count*1.65):count,palette:palettes[i===2?3:i+1]})));
  for (let i=0;i<3;i++) { const parent=show[i]; show.push({id:7+i,stage:"secondary",pattern:i===1?"ring":"star",x:parent.x+(i===2?-.08:.08),y:parent.y+.12,launch:-1,at:parent.at+.10+i*.01,radius:parent.radius*.32,count:Math.round(count*.3),palette:parent.palette}); }
  if(quality!=="low") for(let i=0;i<2;i++) show.push({id:10+i,stage:"background",pattern:"chrysanthemum",x:.35+i*.30,y:.23,launch:-1,at:.69+i*.025,radius:.14,count:Math.round(count*.35),palette:palettes[i+1]});
  if (!variant) return show;
  const patterns: FireworksPattern[] = ["chrysanthemum", "ring", "star", "willow", "ring"];
  const offsets = [0,.08,-.08,.04,-.04];
  return show.map(b => ({ ...b, x: Math.max(.16,Math.min(.84,b.x+offsets[variant%5])), pattern: b.id === 0 ? patterns[variant%5] : b.pattern, palette: b.id === 0 ? (variant%5===4 ? [C.purple,C.magenta,C.white] : palettes[variant%palettes.length]) : b.palette }));
}

export function fireworksRadius(bounds:{width:number;height:number}, b:FireworksBurst) {
  // Fast star particles travel beyond the authored radius; willow needs extra falling room.
  const spread=b.pattern==="star"?1.65:b.pattern==="ring"?1.3:1.15;
  const falling=b.pattern==="willow"?1.9:spread+.5;
  return Math.max(0,Math.min(bounds.width*b.radius,bounds.width*(Math.min(b.x,1-b.x)-.025)/spread,bounds.height*(b.stage==="finale-side"?.17:b.y*.88)/spread,(bounds.height*(1-b.y)-70)/falling, b.stage==="finale-center"?330:240));
}

/** Cubic Bezier with an accelerating travel phase and a final 99ms hold. */
export function fireworksProjectile(b:FireworksBurst,t:number) {
  const s=Math.max(0,Math.min(1,t))**1.6,u=1-s;
  const x0=b.id%4===2?.78:b.id%4===3?.22:.48;
  return {x:u**3*x0+3*u*u*s*(x0+(b.x-x0)*.1)+3*u*s*s*(b.x+(b.id%2?.055:-.055))+s**3*b.x,y:u**3*.82+3*u*u*s*.70+3*u*s*s*(b.y+.15)+s**3*b.y};
}

export type FireworksParticle = {angle:number;speed:number;drag:number;gravity:number;life:number;delay:number;size:number;rotation:number;kind:number;depth:number;color:string;willow:boolean;seed:number};
export function fireworksParticles(b:FireworksBurst):FireworksParticle[] {
  return Array.from({length:b.count},(_,i)=> {
    const ring=i%3,n=fireworkNoise(b.id*137+i,1);
    return {angle:i/b.count*Math.PI*2+(b.pattern==="ring"?0:n*.2), speed:b.pattern==="ring"?.88:b.pattern==="star"?.85+n*.35:.50+n*.48,
      drag:b.pattern==="star"?1.8:2.4+n,gravity:b.pattern==="willow"?1.4+n*.4:.3+n*.25,life:b.pattern==="willow"?.34+n*.09:.20+n*.12,
      delay:ring*.0133,size:.8+fireworkNoise(i,b.id+2)*1.3,rotation:n*Math.PI,kind:i%11===0?1:i%7===0?2:i%5===0?3:0,depth:i%9===0?2:i%4===0?0:1,
      color:b.palette[ring],willow:b.pattern==="willow",seed:i+b.id*97};
  });
}

/** Analytic ballistic motion: exponential drag, gravity, late twinkle; no integration drift. */
export function fireworksFrame(p:FireworksParticle,age:number) {
  const t=Math.max(0,Math.min(1,age)), time=t*1.8,decay=Math.exp(-p.drag*time),travel=(1-decay)/p.drag;
  const vx=Math.cos(p.angle)*p.speed*2.7,vy=Math.sin(p.angle)*p.speed*2.7;
  const twinkle=t>.6?.35+.65*Math.sin(t*43+p.seed)**2:1;
  return {x:vx*travel,y:vy*travel+p.gravity*(time-travel)/p.drag,vx:vx*decay,vy:vy*decay+p.gravity*travel,
    opacity:t<=0||t>=1?0:Math.min(1,t*22)*Math.min(1,(1-t)*4)*twinkle*(p.depth===0?.45:1),scale:(1-t*.45)*(t>.65?.75+.4*Math.sin(t*31+p.seed)**2:1),rotation:p.rotation+t*.6};
}

/** Fixed geometry per cohort for the native renderer; points are batched into paths. */
export function fireworksCohortPath(particles:readonly FireworksParticle[]) {
  return particles.map(p=>{const x=Math.cos(p.angle)*p.speed*72,y=Math.sin(p.angle)*p.speed*72,s=p.size;
    if(p.kind===1)return `M${x} ${y-s*2} l${s*.5} ${s*1.5} l${s*1.5} ${s*.5} l${-s*1.5} ${s*.5} l${-s*.5} ${s*1.5} l${-s*.5} ${-s*1.5} l${-s*1.5} ${-s*.5} l${s*1.5} ${-s*.5}Z`;
    if(p.kind===2)return `M${x} ${y-s} l${s} ${s} l${-s} ${s} l${-s} ${-s}Z`;
    if(p.kind===3)return `M${x-s*.4} ${y} a${s*.4} ${s*.4} 0 1 0 ${s*.8} 0 a${s*.4} ${s*.4} 0 1 0 ${-s*.8} 0`;
    return `M${x} ${y} l${-Math.cos(p.angle)*s*5} ${-Math.sin(p.angle)*s*5} l${Math.cos(p.angle+.2)*s*4} ${Math.sin(p.angle+.2)*s*4}Z`;
  }).join(" ");
}
