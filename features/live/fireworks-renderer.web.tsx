import { useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { FIREWORK_COLORS as C, fireworksPlan, fireworksParticles, fireworksProjectile, fireworksFrame, fireworksRadius } from "./fireworks-show-model";

export function FireworksRenderer({bounds,progress,quality,reducedMotion,effect}:SceneProps) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const width=bounds.width,height=bounds.height;
  const bursts=useMemo(()=>fireworksPlan(quality,effect.variant ?? 0).filter(b=>!reducedMotion||b.id===0).map(b=>({b,particles:fireworksParticles(b)})),[quality,reducedMotion,effect.variant]);
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas?.getContext("2d");
    if(!canvas||!ctx||width<=0||height<=0)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const sprites=new Map<string,HTMLCanvasElement>();
    function glow(color:string) {
      let sprite=sprites.get(color);if(sprite)return sprite;
      sprite=document.createElement("canvas");sprite.width=96;sprite.height=96;
      const sc=sprite.getContext("2d")!;const g=sc.createRadialGradient(48,48,0,48,48,48);
      g.addColorStop(0,"#FFFFFF");g.addColorStop(.09,color);g.addColorStop(.3,color+"66");g.addColorStop(1,color+"00");
      sc.fillStyle=g;sc.fillRect(0,0,96,96);sprites.set(color,sprite);return sprite;
    }
    function light(x:number,y:number,size:number,color:string,opacity:number) {
      if(opacity<=0||size<=0)return;ctx!.globalAlpha=Math.min(1,opacity);ctx!.drawImage(glow(color),x-size/2,y-size/2,size,size);
    }
    function draw(p:number) {
      ctx!.clearRect(0,0,width,height);if(p<=0||p>=1)return;
      ctx!.globalCompositeOperation="lighter";
      for(const {b,particles} of bursts) {
        const cx=b.x*width,cy=b.y*height,r=fireworksRadius({width,height},b);
        if(b.launch>=0&&p>=b.launch&&p<b.at) {
          const arrival=b.at-.022,t=Math.min(1,(p-b.launch)/(arrival-b.launch));
          const head=fireworksProjectile(b,t),x=head.x*width,y=head.y*height;
          // Successive samples taper along the curved trajectory, rather than a fixed line.
          for(let k=13;k>=0;k--){const trail=fireworksProjectile(b,Math.max(0,t-k*.024));
            light(trail.x*width,trail.y*height,(15-k*.7)*(reducedMotion?.65:1),k>8?C.magenta:k>4?C.orange:C.gold,(1-k/14)*.72);
          }
          light(x,y,24*(t>=1?1+Math.min(1,(p-arrival)/.022)*.8:1),C.gold,1);
          ctx!.globalAlpha=1;ctx!.fillStyle=C.white;ctx!.beginPath();ctx!.arc(x,y,2.2,0,Math.PI*2);ctx!.fill();
          if(!reducedMotion)for(let k=0;k<6;k++){const trail=fireworksProjectile(b,Math.max(0,t-k*.075));light(trail.x*width+Math.sin(k*17+p*41)*8,trail.y*height+k*5,6,C.orange,.4*(1-k/6));if(k%2===0)light(trail.x*width,trail.y*height+12,22,"#77849A",.025);}
        }
        const elapsed=p-b.at;if(elapsed<0)continue;
        const fade=Math.max(0,Math.min(1,(1-p)/.13));
        light(cx,cy,r*(.10+Math.min(1,elapsed/.018)*.50),C.champagne,Math.max(0,1-elapsed/.055)*(reducedMotion?.3:1));
        if(elapsed<.055&&!reducedMotion)light(cx,cy,r*3,b.palette[1],Math.max(0,.12*(1-elapsed/.055)));
        // Three independently timed rings, including the pale double shockwave on the finale.
        if(!reducedMotion)for(let ring=0;ring<3;ring++) {
          const age=elapsed-ring*.0133;if(age<0||age>.16)continue;
          ctx!.globalAlpha=Math.sin(Math.min(1,age/.16)*Math.PI)*.3*fade;ctx!.strokeStyle=b.palette[ring];ctx!.lineWidth=ring===0?1.6:.8;
          ctx!.beginPath();ctx!.arc(cx,cy,r*Math.min(1,age/.07)*(.38+ring*.21),0,Math.PI*2);ctx!.stroke();
        }
        for(const particle of particles) {
          if(reducedMotion&&particle.seed%3!==0)continue;
          const age=(elapsed-particle.delay)/Math.min(particle.life,.97-b.at-particle.delay);
          if(age<=0||age>=1)continue;
          const f=fireworksFrame(particle,age),x=cx+f.x*r*.90,y=cy+f.y*r*.90;
          if(y>height-70||x<0||x>width)continue;
          const alpha=f.opacity*fade*(b.stage==="background"?.45:1)*(reducedMotion?.65:1);
          const size=particle.size*f.scale*(particle.depth===2?1+age*.65:1);
          const color=reducedMotion?C.gold:particle.color;
          const tail=fireworksFrame(particle,Math.max(0,age-(particle.willow?.24:b.pattern==="star"?.08:.04)));
          ctx!.globalAlpha=alpha*(particle.willow?.5:.3);ctx!.strokeStyle=particle.willow?C.gold:color;ctx!.lineWidth=particle.willow?2:1;
          ctx!.beginPath();ctx!.moveTo(cx+tail.x*r*.90,cy+tail.y*r*.90);ctx!.quadraticCurveTo(x,cy+tail.y*r*.90,x,y);ctx!.stroke();
          light(x,y,size*(particle.depth===2?18:10),color,alpha*.7);
          ctx!.globalAlpha=alpha;ctx!.fillStyle=color;ctx!.save();ctx!.translate(x,y);ctx!.rotate(f.rotation);
          if(particle.kind===1){ctx!.beginPath();ctx!.moveTo(0,-size*2.3);ctx!.lineTo(size*.6,-size*.6);ctx!.lineTo(size*2.3,0);ctx!.lineTo(size*.6,size*.6);ctx!.lineTo(0,size*2.3);ctx!.lineTo(-size*.6,size*.6);ctx!.lineTo(-size*2.3,0);ctx!.lineTo(-size*.6,-size*.6);ctx!.closePath();ctx!.fill();}
          else if(particle.kind===2){ctx!.beginPath();ctx!.moveTo(0,-size*1.6);ctx!.lineTo(size,0);ctx!.lineTo(0,size*1.6);ctx!.lineTo(-size,0);ctx!.closePath();ctx!.fill();}
          else {ctx!.beginPath();ctx!.arc(0,0,Math.max(.55,size*.6),0,Math.PI*2);ctx!.fill();}
          ctx!.fillStyle=C.white;ctx!.fillRect(-.5,-.5,1,1);ctx!.restore();
        }
        if(elapsed>.10&&b.pattern==="willow")light(cx,cy+r*.30,r*1.6,C.gold,.08*fade*Math.max(0,1-elapsed/.4));
      }
      ctx!.globalAlpha=1;ctx!.globalCompositeOperation="source-over";
    }
    let frame:number|null=null,hidden=false,latest=0;
    const schedule=()=>{if(hidden||frame!==null)return;frame=requestAnimationFrame(()=>{frame=null;draw(latest);});};
    const listener=progress.addListener(({value})=>{latest=value;schedule();});
    // Read once when mounting after a preview seek; subsequent values come from the shared clock.
    latest=(progress as unknown as {__getValue():number}).__getValue();schedule();
    const stop=()=>{hidden=true;if(frame!==null)cancelAnimationFrame(frame);frame=null;ctx.clearRect(0,0,width,height);};
    const visibility=()=>{if(document.hidden)stop();else{hidden=false;schedule();}};
    document.addEventListener("visibilitychange",visibility);
    const appState=AppState.addEventListener("change",state=>{if(state!=="active")stop();else{hidden=false;schedule();}});
    return()=>{stop();progress.removeListener(listener);document.removeEventListener("visibilitychange",visibility);appState.remove();sprites.clear();canvas.width=0;canvas.height=0;};
  },[width,height,progress,bursts,reducedMotion]);
  return <canvas aria-hidden="true" ref={canvasRef} style={{position:"absolute",inset:0,width,height,pointerEvents:"none"}} />;
}
