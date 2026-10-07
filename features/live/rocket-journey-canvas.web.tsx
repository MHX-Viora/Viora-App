import { useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { rocketLayout, ROCKET_COLORS as C } from "./premium-gift-rocket-model";
import { JOURNEY as J, rocketJourneyBudget, rocketJourneyPoint, rocketJourneyBank, rocketGates, rocketArcWindows, rocketFinalePlan, rocketQuiet } from "./rocket-journey-model";
import { fireworkNoise, fireworksParticles, fireworksFrame, fireworksRadius } from "./fireworks-show-model";

export function RocketJourneyCanvas({bounds,effect,progress,quality,reducedMotion}:SceneProps) {
  const canvasRef=useRef<HTMLCanvasElement>(null),width=bounds.width,height=bounds.height;
  const layout=useMemo(()=>rocketLayout({width,height},effect.variant ?? 0),[width,height,effect.variant]);
  const budget=useMemo(()=>rocketJourneyBudget(quality),[quality]);
  const finale=useMemo(()=>rocketFinalePlan(quality, layout.end.x / width).map(b=>({b,particles:fireworksParticles(b)})),[quality, layout.end.x, width]);
  const arcs=useMemo(()=>rocketArcWindows(effect.durationMs),[effect.durationMs]);
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas?.getContext("2d");if(!canvas||!ctx||!width||!height)return;
    const dpr=quality==="low"?1:Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const glows=new Map<string,HTMLCanvasElement>();
    function sprite(color:string){let s=glows.get(color);if(s)return s;s=document.createElement("canvas");s.width=96;s.height=96;const g=s.getContext("2d")!,r=g.createRadialGradient(48,48,0,48,48,48);r.addColorStop(0,C.white);r.addColorStop(.1,color);r.addColorStop(.4,color+"44");r.addColorStop(1,color+"00");g.fillStyle=r;g.fillRect(0,0,96,96);glows.set(color,s);return s;}
    function glow(x:number,y:number,size:number,color:string,alpha:number){if(size<=0||alpha<=0)return;ctx!.globalAlpha=Math.min(1,alpha);ctx!.drawImage(sprite(color),x-size/2,y-size/2,size,size);}
    function dot(x:number,y:number,size:number,color:string,alpha:number,kind=0,rotation=0){if(y>height-75||y<0||x<0||x>width||alpha<=0)return;if(quality!=="low"||size>=1.5)glow(x,y,size*9,color,alpha*.6);ctx!.globalAlpha=alpha;ctx!.fillStyle=color;ctx!.save();ctx!.translate(x,y);ctx!.rotate(rotation);if(kind===1){ctx!.beginPath();ctx!.moveTo(0,-size*2);ctx!.lineTo(size*.6,-size*.6);ctx!.lineTo(size*2,0);ctx!.lineTo(size*.6,size*.6);ctx!.lineTo(0,size*2);ctx!.lineTo(-size*.6,size*.6);ctx!.lineTo(-size*2,0);ctx!.lineTo(-size*.6,-size*.6);ctx!.closePath();ctx!.fill();}else if(kind===2){ctx!.beginPath();ctx!.moveTo(0,-size*1.8);ctx!.lineTo(size,0);ctx!.lineTo(0,size*1.8);ctx!.lineTo(-size,0);ctx!.closePath();ctx!.fill();}else if(kind===3){ctx!.fillRect(-size*3,-size*.3,size*6,size*.6);}else{ctx!.beginPath();ctx!.arc(0,0,Math.max(.6,size*.6),0,Math.PI*2);ctx!.fill();}ctx!.restore();}
    const colors=[C.gold,C.pink,C.cyan];
    function draw(p:number){
      ctx!.clearRect(0,0,width,height);if(p<=0||p>=1||reducedMotion||rocketQuiet(p))return;
      ctx!.globalCompositeOperation="lighter";
      const head=rocketJourneyPoint(layout,p),bank=rocketJourneyBank(layout,Math.min(p,J.arrival-.002));
      const flying=p>=J.launch&&p<J.arrival;
      const wakeFade=p<J.portal?1:Math.max(0,(J.arrival-p)/(J.arrival-J.portal));
      if(flying){
        // World-space plasma does not shrink with the Rocket. Three twisting color ribbons share it.
        const ribbonSamples=quality==="low"?12:quality==="medium"?18:24;
        for(let ribbon=0;ribbon<3;ribbon++)for(let k=0;k<ribbonSamples;k++){
          const age=k/ribbonSamples,previous=rocketJourneyPoint(layout,Math.max(J.launch,p-k*.005*24/ribbonSamples));
          const wave=Math.sin(age*14-p*65+ribbon*2.1)*layout.size*.10*(1-age);
          const x=previous.x+Math.cos(bank)*wave-Math.sin(bank)*layout.size*age*.45,y=previous.y+Math.sin(bank)*wave+Math.cos(bank)*layout.size*(.25+age*.45);
          glow(x,y,layout.size*(.18-age*.12),colors[ribbon],(.13+Math.max(0,p-J.boost))*(1-age)*wakeFade);
          if(age<.70){ctx!.globalAlpha=.55*(1-age)*wakeFade;ctx!.fillStyle=colors[ribbon];ctx!.beginPath();ctx!.arc(x,y,Math.max(.5,1.5*(1-age)),0,Math.PI*2);ctx!.fill();}
        }
        // Peripheral, trajectory-oriented tunnel leaves a clear corridor for the hero.
        if(p>J.boost){ctx!.save();ctx!.translate(head.x,head.y);ctx!.rotate(bank);const strength=Math.min(1,(p-J.boost)/.04)*wakeFade;
          for(let i=0;i<Math.round(24*budget.factor);i++){const side=i%2?-1:1,n=fireworkNoise(i,3),distance=layout.size*(.50+n*.95),offset=((p*11+i*.13)%1)*height*.26;ctx!.globalAlpha=strength*(i%3===0?.65:.24);ctx!.strokeStyle=[C.white,C.gold,C.cyan,C.pink][i%4];ctx!.lineWidth=i%3===0?1.7:.7;ctx!.beginPath();ctx!.moveTo(side*distance,offset-layout.size*.45);ctx!.lineTo(side*(distance+height*.06),offset+layout.size*(.45+n));ctx!.stroke();}ctx!.restore();}
        for(let i=0;i<budget.field;i++){
          const depth=i%3,life=(p*({0:1.5,1:2.7,2:4.5}[depth]!)+fireworkNoise(i,6))%1;
          const side=i%2?1:-1,distance=layout.size*(.22+fireworkNoise(i,5)*1.5);
          const push=p>J.boost?Math.min(1,(p-J.boost)/.12)*layout.size*.22:0;
          const x=head.x+side*(distance+push+life*layout.size*.18),y=head.y+(life-.45)*layout.size*2.0;
          dot(x,y,(depth===2?2:depth===0?.7:1.1)*(1+life*.25),colors[i%3],Math.sin(life*Math.PI)*(depth===0?.24:.58)*wakeFade,i%13===0?2:i%7===0?1:i%4===0?3:0,p*(i%2?4:-3));
        }
        for(let i=0;i<budget.comets;i++){const start=J.launch+.065+i*.035,age=(p-start)/(.065+i%2*.01);if(age<=0||age>=1)continue;
          const point=rocketJourneyPoint(layout,start+age*.055),side=i%2?-1:1,x=point.x+side*layout.size*(.6+i*.08),y=point.y+layout.size*.2;
          ctx!.globalAlpha=Math.sin(age*Math.PI)*.7;ctx!.strokeStyle=colors[i%3];ctx!.lineWidth=2;ctx!.beginPath();ctx!.moveTo(x-Math.sin(bank)*layout.size*.30,y+Math.cos(bank)*layout.size*.30);ctx!.lineTo(x,y);ctx!.stroke();dot(x,y,layout.size*.035,colors[i%3],Math.sin(age*Math.PI),0);
          if(age>.7)for(let k=0;k<3;k++)dot(x+(k-1)*age*12,y+age*10,1,colors[i%3],(1-age)*2,1);
        }
        for(const window of arcs)if(p>=window.start&&p<window.end){ctx!.globalAlpha=.8;ctx!.strokeStyle=C.cyan;ctx!.lineWidth=1.2;ctx!.beginPath();ctx!.moveTo(head.x-layout.size*.23,head.y);for(let k=1;k<7;k++)ctx!.lineTo(head.x-layout.size*.23+k*layout.size*.08,head.y+Math.sin(k*17+window.start*50)*layout.size*.10);ctx!.stroke();ctx!.strokeStyle=C.white;ctx!.lineWidth=.4;ctx!.stroke();}
        for(const gate of rocketGates(layout)){const age=(p-gate.at)/.07;if(age<=0||age>=1)continue;for(let i=0;i<10;i++){const angle=i*Math.PI/5,spread=layout.size*(.2+age*.9);dot(gate.point.x+Math.cos(angle)*spread,gate.point.y+Math.sin(angle)*spread,2*(1-age),gate.color,1-age,2,p*7);}}
        const sonic=(p-J.sonic)/.065;if(sonic>0&&sonic<1)for(let i=0;i<budget.sparks;i++){const a=i*Math.PI*2/budget.sparks,center=rocketJourneyPoint(layout,J.sonic),r=layout.size*(.15+sonic*1.2);dot(center.x+Math.cos(a)*r,center.y+Math.sin(a)*r,1.4,C.cyan,1-sonic,i%5===0?1:0);}
      }
      if(p>=J.burst){
        for(const {b,particles} of finale){const age=p-b.at;if(age<0)continue;const r=fireworksRadius({width,height},b),cx=b.x*width,cy=b.y*height;
          for(const particle of particles){const life=Math.min(particle.life,.985-b.at-particle.delay),t=(age-particle.delay)/life;if(t<=0||t>=1)continue;const f=fireworksFrame(particle,t),x=cx+f.x*r*.9,y=cy+f.y*r*.9,tail=fireworksFrame(particle,Math.max(0,t-(particle.willow?.22:.065)));
            ctx!.globalAlpha=f.opacity*.42;ctx!.strokeStyle=particle.willow?C.gold:particle.color;ctx!.lineWidth=particle.willow?1.7:1;ctx!.beginPath();ctx!.moveTo(cx+tail.x*r*.9,cy+tail.y*r*.9);ctx!.quadraticCurveTo(x,cy+tail.y*r*.9,x,y);ctx!.stroke();dot(x,y,particle.size*f.scale,particle.color,f.opacity,particle.kind,f.rotation);
          }
          if(age<.075)glow(cx,cy,r*(.45+age*6),b.palette[0],Math.max(0,.55-age*6));
          if(b.pattern==="ring")for(let ring=0;ring<2;ring++){const t=age-ring*.014;if(t<0||t>.13)continue;ctx!.globalAlpha=Math.sin(t/.13*Math.PI)*.4;ctx!.strokeStyle=b.palette[ring];ctx!.lineWidth=1;ctx!.beginPath();ctx!.arc(cx,cy,r*Math.min(1,t/.045)*(ring?.8:.5),0,Math.PI*2);ctx!.stroke();}
        }
        for(let i=0;i<budget.swarm;i++){const start=J.swarm+i*.007,age=(p-start)/.075;if(age<=0||age>=1.8)continue;const a=-Math.PI*.92+i/budget.swarm*Math.PI*1.85,endX=layout.end.x+Math.cos(a)*layout.burstRadius*.86,endY=layout.end.y+Math.sin(a)*layout.burstRadius*.57;
          if(age<1){const x=layout.end.x+(endX-layout.end.x)*age,y=layout.end.y+(endY-layout.end.y)*age;ctx!.globalAlpha=.85;ctx!.strokeStyle=colors[i%3];ctx!.lineWidth=2;ctx!.beginPath();ctx!.moveTo(x-Math.cos(a)*20,y-Math.sin(a)*20);ctx!.lineTo(x,y);ctx!.stroke();dot(x,y,2,C.gold,1);}
          else for(let k=0;k<9;k++){const a2=k*Math.PI*2/9,r=(age-1)*25;dot(endX+Math.cos(a2)*r,endY+Math.sin(a2)*r,1.3,colors[i%3],(1.8-age)/.8,k%3===0?1:0);}
        }
        if(p>J.willow)for(let i=0;i<Math.round(budget.field*.65);i++){const t=(p-J.willow)/(1-J.willow),x=width*(.18+fireworkNoise(i,4)*.66),y=height*(.20+fireworkNoise(i,5)*.18)+t*t*height*.27;dot(x,y,(i%4===0?2.1:1)*(1-t*.5),i%4===0?C.pink:i%3===0?C.cyan:C.gold,(1-t)*(.4+.6*Math.sin(p*85+i)**2),i%7===0?2:i%5===0?1:0,t*2);}
        const nebula=Math.max(0,(1-p)/.125);if(p>J.afterglow){glow(layout.end.x-20,layout.end.y,layout.burstRadius*2,C.gold,.09*nebula);glow(layout.end.x+30,layout.end.y+15,layout.burstRadius*1.7,C.pink,.07*nebula);glow(layout.end.x,layout.end.y+35,layout.burstRadius*1.6,C.cyan,.07*nebula);}
      }
      ctx!.globalCompositeOperation="source-over";ctx!.globalAlpha=1;
    }
    let pending:number|null=null,hidden=false,latest=(progress as unknown as {__getValue():number}).__getValue();
    const schedule=()=>{if(hidden||pending!==null)return;pending=requestAnimationFrame(()=>{pending=null;draw(latest);});};
    const listener=progress.addListener(({value})=>{latest=value;schedule();});schedule();
    const stop=()=>{hidden=true;if(pending!==null)cancelAnimationFrame(pending);pending=null;ctx.clearRect(0,0,width,height);};
    const visibility=()=>{if(document.hidden)stop();else{hidden=false;schedule();}};document.addEventListener("visibilitychange",visibility);
    const subscription=AppState.addEventListener("change",s=>{if(s!=="active")stop();else{hidden=false;schedule();}});
    return()=>{stop();progress.removeListener(listener);document.removeEventListener("visibilitychange",visibility);subscription.remove();glows.clear();canvas.width=0;canvas.height=0;};
  },[width,height,layout,progress,reducedMotion,budget,finale,arcs,quality]);
  return <canvas aria-hidden="true" ref={canvasRef} style={{position:"absolute",inset:0,width,height,pointerEvents:"none"}} />;
}
