import type { CinematicQuality } from "./premium-gift-cinematic";
import { rocketBezier, ROCKET_COLORS as C, type RocketLayout } from "./premium-gift-rocket-model.ts";
import type { FireworksBurst } from "./fireworks-show-model";

import { JOURNEY } from "./rocket-journey-timeline.ts";
export { JOURNEY } from "./rocket-journey-timeline.ts";
export const ROCKET_PHASE_INPUT=[0,.067,.133,.205,.40,.435,.655,.675,.875,1];
export const ROCKET_PHASE_OUTPUT=[0,.067,.167,.25,.417,.452,.567,.584,.89,1];

export function rocketVisualPhase(progress:number){
  const p=Math.max(0,Math.min(1,progress));
  for(let i=1;i<ROCKET_PHASE_INPUT.length;i++)if(p<=ROCKET_PHASE_INPUT[i])return ROCKET_PHASE_OUTPUT[i-1]+(p-ROCKET_PHASE_INPUT[i-1])/(ROCKET_PHASE_INPUT[i]-ROCKET_PHASE_INPUT[i-1])*(ROCKET_PHASE_OUTPUT[i]-ROCKET_PHASE_OUTPUT[i-1]);
  return 1;
}
export const rocketQuiet=(p:number)=>p>=JOURNEY.arrival&&p<JOURNEY.burst;
export function rocketJourneyPoint(layout:RocketLayout,p:number){
  const phase=rocketVisualPhase(p);
  if(phase<.25){const t=Math.max(0,Math.min(1,(phase-.067)/(.183-.067)));return {x:layout.core.x+(layout.start.x-layout.core.x)*t,y:layout.core.y+(layout.start.y-layout.core.y)*t};}
  return rocketBezier(layout,Math.max(0,Math.min(1,(phase-.25)/(.567-.25)))**1.8);
}
export function rocketJourneyBank(layout:RocketLayout,p:number){const a=rocketJourneyPoint(layout,p),b=rocketJourneyPoint(layout,Math.min(JOURNEY.arrival,p+.001));return Math.atan2(b.x-a.x,a.y-b.y);}
export function rocketGates(layout:RocketLayout){return [JOURNEY.gate1,JOURNEY.gate2,JOURNEY.gate3].map((at,i)=>({at,point:rocketJourneyPoint(layout,at),color:[C.gold,C.cyan,C.pink][i],rotation:rocketJourneyBank(layout,at)*180/Math.PI}));}
export function rocketJourneyBudget(q:CinematicQuality){const factor={low:.5,medium:.7,high:1,ultra:1}[q];return {field:60*factor,sparks:Math.round(28*factor),comets:q==="low"?3:q==="medium"?4:6,swarm:q==="low"?5:q==="medium"?6:8,factor};}
export function rocketArcWindows(duration:number){
  const windows:{start:number;end:number}[]=[];let at=.16*duration;let i=0;
  while(at<JOURNEY.arrival*duration){const life=55+(i*19%55);windows.push({start:at/duration,end:(at+life)/duration});at+=life+150+(i*73%251);i++;}
  return windows;
}
export function rocketFinalePlan(q:CinematicQuality, centerX = .62):FireworksBurst[]{
  const n=Math.round(120*rocketJourneyBudget(q).factor);
  const main:FireworksBurst={id:40,stage:"finale-center",pattern:"chrysanthemum",x:centerX,y:.24,launch:-1,at:JOURNEY.burst,radius:.34,count:n,palette:[C.gold,C.orange,C.white]};
  const count=q==="low"?4:q==="medium"?5:7;
  return [main,...Array.from({length:count},(_,i)=>({id:41+i,stage:"secondary" as const,pattern:(["ring","star","willow","ring","chrysanthemum","star","willow"] as const)[i],x:[.27,.76,.39,.68,.52,.82,.24][i],y:[.31,.32,.43,.44,.20,.23,.46][i],launch:-1,at:JOURNEY.burst+.075+i*.010,radius:.11+(i%3)*.018,count:Math.round(n*.32),palette:[[C.gold,C.orange,C.white],[C.pink,"#A855F7",C.gold],[C.cyan,C.blue,C.white]][i%3]}))];
}
