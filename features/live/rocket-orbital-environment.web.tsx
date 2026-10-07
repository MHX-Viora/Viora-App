import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { orbitalBudget, orbitalFrame, orbitalLayout, orbitalSkyColor, orbitalNoise as noise, ramp, smooth, ORBITAL_COLORS as C } from "./rocket-orbital-model";

// Environment owns a single coalesced RAF. Cached sprites carry lighting/detail, not React particles.
export function RocketOrbitalEnvironment({ bounds, progress, quality, reducedMotion, effect }: SceneProps) {
  const ref=useRef<HTMLCanvasElement>(null), combo=useRef(effect.quantity);
  combo.current=effect.quantity;
  const {width:w,height:h}=bounds;
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas?.getContext("2d"); if(!canvas||!ctx||w<=0||h<=0)return;
    const budget=orbitalBudget(quality),layout=orbitalLayout({width:w,height:h}),dpr=Math.min(budget.dpr,window.devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const sprite=(width:number,height:number,paint:(g:CanvasRenderingContext2D)=>void)=>{
      const c=document.createElement("canvas");c.width=width;c.height=height;const g=c.getContext("2d");if(g)paint(g);return c;
    };
    const cloud=sprite(512,256,g=>{
      // Soft overlapping volumes: warm lit crowns, blue occlusion on the lower hemisphere.
      for(let i=0;i<75;i++){
        const x=35+noise(i,2)*442,y=90+noise(i,3)*100,r=22+noise(i,4)*55;
        const v=g.createRadialGradient(x-r*.25,y-r*.4,1,x,y,r);
        v.addColorStop(0,"rgba(255,245,218,.8)");v.addColorStop(.38,"rgba(238,210,201,.64)");
        v.addColorStop(.70,"rgba(113,137,181,.38)");v.addColorStop(1,"rgba(45,77,124,0)");
        g.fillStyle=v;g.fillRect(x-r,y-r,r*2,r*2);
      }
    });
    const earth=sprite(768,768,g=>{
      const sea=g.createRadialGradient(220,130,20,384,384,370);
      sea.addColorStop(0,"#448CAE");sea.addColorStop(.4,"#184262");sea.addColorStop(.75,"#071A35");sea.addColorStop(1,"#020717");
      g.fillStyle=sea;g.beginPath();g.arc(384,384,373,0,Math.PI*2);g.fill();
      g.save();g.clip();
      for(let continent=0;continent<9;continent++){
        const x=120+noise(continent,20)*520,y=90+noise(continent,21)*580;
        g.beginPath();for(let j=0;j<22;j++){
          const a=j/22*Math.PI*2,r=35+noise(j+continent*19,22)*95;
          const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.65;if(j)g.lineTo(px,py);else g.moveTo(px,py);
        }g.closePath();g.fillStyle=continent%2?"#1B343B":"#263E40";g.fill();
      }
      for(let i=0;i<600;i++){
        const x=noise(i,24)*768,y=noise(i,25)*768;
        if(noise(i,26)>.73){g.fillStyle="rgba(255,202,95,.7)";g.fillRect(x,y,1.2,1.2);}
      }
      for(let i=0;i<65;i++){
        g.globalAlpha=.13;g.drawImage(cloud,noise(i,27)*768-100,noise(i,28)*768-50,100+noise(i,29)*160,60);
      }g.globalAlpha=1;g.restore();
    });
    const nebula=sprite(640,512,g=>{
      g.translate(320,256);g.rotate(-.4);
      for(let i=0;i<30;i++){
        const x=Math.cos(i*.63)*i*7,y=Math.sin(i*.63)*i*3;
        const gradient=g.createRadialGradient(x,y,0,x,y,75);
        gradient.addColorStop(0,i%3?"rgba(106,75,182,.21)":"rgba(49,143,209,.17)");gradient.addColorStop(1,"rgba(20,20,75,0)");
        g.fillStyle=gradient;g.fillRect(x-75,y-75,150,150);
      }
      const core=g.createRadialGradient(0,0,0,0,0,55);core.addColorStop(0,"rgba(255,225,181,.5)");core.addColorStop(1,"rgba(192,90,186,0)");g.fillStyle=core;g.fillRect(-55,-55,110,110);
      for(let i=0;i<260;i++){
        const turn=i*.19,r=12+Math.sqrt(i)*12,x=Math.cos(turn)*r,y=Math.sin(turn)*r*.42;
        g.fillStyle=i%3?"rgba(124,120,224,.35)":"rgba(224,170,215,.45)";g.beginPath();g.arc(x+noise(i,8)*15,y+noise(i,9)*9,.5+noise(i,10),0,Math.PI*2);g.fill();
      }
    });
    const glow=(x:number,y:number,r:number,color:string,alpha:number)=>{
      if(r<=0||alpha<=0)return;ctx.save();ctx.globalAlpha=Math.min(1,alpha);
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.2,color+"88");g.addColorStop(1,color+"00");ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
    };
    const star=(x:number,y:number,size:number,alpha:number)=>{
      ctx.globalAlpha=alpha;ctx.fillStyle=C.white;ctx.fillRect(x,y,size,size);
      if(size>1.6){ctx.fillRect(x-size*2,y+size*.35,size*5,size*.25);ctx.fillRect(x+size*.35,y-size*2,size*.25,size*5);}
    };
    const draw=(p:number)=>{
      ctx.clearRect(0,0,w,h); if(p<=0||p>=1)return;
      const f=orbitalFrame(p,reducedMotion),ms=p*8500;
      ctx.save();ctx.globalAlpha=f.overlay;
      // Gradual dim preserves the moving Live underneath until the cloud corridor takes over.
      ctx.fillStyle=`rgba(2,4,11,${reducedMotion?.24:.35})`;ctx.fillRect(0,0,w,h);
      if(reducedMotion){
        glow(w*.5,h*.5,layout.size,C.cyan,.12*f.ignition);
        const x=w*.5,y=h*.5+layout.size*.28,length=layout.size*.5;
        const trail=ctx.createLinearGradient(x,y,x,y+length);trail.addColorStop(0,C.white);trail.addColorStop(.2,C.gold+"66");trail.addColorStop(1,C.cyan+"00");
        ctx.globalAlpha=f.overlay*f.rocket*f.ignition*.35;ctx.fillStyle=trail;ctx.beginPath();ctx.moveTo(x-3,y);ctx.quadraticCurveTo(x-6,y+length*.3,x,y+length);ctx.quadraticCurveTo(x+6,y+length*.3,x+3,y);ctx.closePath();ctx.fill();ctx.restore();return;
      }
      const sky=smooth(ms,1800,3500),atmo=smooth(ms,3400,5500);
      const skyGradient=ctx.createLinearGradient(0,0,0,h);
      skyGradient.addColorStop(0,orbitalSkyColor(.5+atmo*.5));
      skyGradient.addColorStop(.6,orbitalSkyColor(.25+atmo*.75));skyGradient.addColorStop(1,orbitalSkyColor(atmo));
      ctx.globalAlpha=f.overlay*sky*.96;ctx.fillStyle=skyGradient;ctx.fillRect(0,0,w,h);
      ctx.globalAlpha=f.overlay*f.space;
      const galaxyW=Math.min(w*1.05,h*.85),galaxyY=h*.28+f.travel*h*.005;
      ctx.drawImage(nebula,w*.66-galaxyW/2,galaxyY-galaxyW*.4,galaxyW,galaxyW*.8);
      // Quiet distant ringed planet; its drift is much slower than nearby stars.
      const planetR=Math.min(w,h)*.095,px=w*.9+f.travel*2,py=h*.15+f.travel*1.5;
      ctx.save();ctx.translate(px,py);ctx.rotate(-.35);ctx.strokeStyle="rgba(167,160,207,.35)";ctx.lineWidth=planetR*.13;
      ctx.beginPath();ctx.ellipse(0,0,planetR*1.7,planetR*.42,0,0,Math.PI*2);ctx.stroke();
      const planet=ctx.createRadialGradient(-planetR*.4,-planetR*.4,0,0,0,planetR);planet.addColorStop(0,"#8182A2");planet.addColorStop(.55,"#3B416A");planet.addColorStop(1,"#050B20");ctx.fillStyle=planet;ctx.beginPath();ctx.arc(0,0,planetR,0,Math.PI*2);ctx.fill();ctx.restore();
      for(let i=0;i<3;i++){
        const ax=w*(.1+noise(i,45)*.82)+f.travel*(i+1),ay=h*(.12+noise(i,46)*.5)+f.travel*(i+1)*2,r=3+noise(i,47)*8;
        ctx.globalAlpha=f.overlay*f.space*.48;const rock=ctx.createRadialGradient(ax-r*.3,ay-r*.3,0,ax,ay,r);rock.addColorStop(0,"#59647A");rock.addColorStop(1,"#080D21");ctx.fillStyle=rock;ctx.beginPath();ctx.arc(ax,ay,r,0,Math.PI*2);ctx.fill();
      }
      for(let i=0;i<budget.stars;i++){
        const depth=i%3,speed=[.008,.027,.065][depth];
        const x=noise(i,30)*w+(noise(i,31)-.5)*f.travel*depth*3;
        const y=(noise(i,32)*h+f.travel*h*speed)%(h+30);
        const alpha=f.overlay*f.space*(.22+depth*.2)*(.8+Math.sin(p*8+i)*.2);
        if(f.warp>.02 && depth>0){
          const dx=x-w*.5,dy=y-h*.35,len=f.warp*(.08+depth*.04);
          ctx.globalAlpha=alpha;ctx.strokeStyle=i%9?C.white:C.cyan;ctx.lineWidth=depth===2?1.3:.6;
          ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx*len,y+dy*len);ctx.stroke();
        }else star(x,y,.6+depth*.65,alpha);
      }
      if(f.earth>0){
        const zoom=smooth(ms,4200,7000),r=layout.horizonRadius*(1.35-zoom*.45),cy=h*(1.30-zoom*.68)+r;
        ctx.globalAlpha=f.overlay*f.earth;
        glow(w*.45,cy-r,r*.75,C.cyan,.10*f.earth);
        ctx.drawImage(earth,w*.5-r,cy-r,r*2,r*2);
        for(let rim=0;rim<3;rim++){
          ctx.strokeStyle=["#6ECFFF","#AAEDFF","#EDF9FF"][rim];ctx.lineWidth=[r*.019,r*.006,r*.0018][rim];ctx.globalAlpha=f.overlay*f.earth*[.13,.6,.65][rim];
          ctx.beginPath();ctx.arc(w*.5,cy,r+rim*1.5,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
        }
      }
      // Three cloud planes move downward at different rates; corridor opens outwards at breakthrough.
      const breakOpen=smooth(ms,2950,3750),cloudFade=f.overlay*f.cloud;
      for(let layer=0;layer<3;layer++)for(let i=0;i<budget.clouds/3;i++){
        const seed=i+layer*41,side=i%2?1:-1;
        const cw=w*(.4+layer*.16+noise(seed,33)*.25),ch=cw*.5;
        const x=w*.5+side*(w*(.2+noise(seed,34)*.28)+breakOpen*w*.5)-cw/2;
        const travelY=(noise(seed,35)*h*1.7+f.travel*h*[.09,.17,.28][layer])%(h*1.7)-h*.3;
        const initialY=h*(.65+noise(seed,35)*.2), blend=smooth(ms,1800,2600),y=initialY+(travelY-initialY)*blend;
        ctx.globalAlpha=cloudFade*[.45,.75,1][layer];ctx.drawImage(cloud,x,y,cw,ch);
      }
      if(f.flash>0){ctx.globalAlpha=f.overlay*f.flash;ctx.fillStyle="#F2F7FF";ctx.fillRect(0,0,w,h);}
      const rx=w*f.x+f.shake,ry=h*f.y,rocketSize=layout.size*f.scale;
      if(f.rocket>0 && f.ignition>0){
        ctx.save();ctx.translate(rx,ry);ctx.rotate(f.bank*Math.PI/180);
        const exhaust=rocketSize*.33,tail=rocketSize*(.9+sky*.8+f.warp*3)*(1+.06*Math.sin(p*180)+.035*Math.sin(p*417)),intensity=1+Math.min(9,Math.max(0,combo.current-1))*.025;
        glow(0,exhaust,rocketSize*.55,C.cyan,.18*f.ignition*intensity);
        ctx.globalCompositeOperation="lighter";
        const flame=(width:number,color:string,alpha:number,offset:number)=>{
          const g=ctx.createLinearGradient(0,exhaust,0,exhaust+tail);g.addColorStop(0,C.white);g.addColorStop(.15,color);g.addColorStop(1,color+"00");
          ctx.globalAlpha=f.overlay*f.rocket*f.ignition*alpha;ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-width,exhaust);
          ctx.bezierCurveTo(-width*1.2,exhaust+tail*.3,-width*.25+offset,exhaust+tail*.8,offset,exhaust+tail);
          ctx.bezierCurveTo(width*.25+offset,exhaust+tail*.8,width*1.2,exhaust+tail*.3,width,exhaust);ctx.closePath();ctx.fill();
        };
        flame(rocketSize*.16,C.magenta,.24,Math.sin(p*135)*rocketSize*.04);
        flame(rocketSize*.105,C.cyan,.42,-rocketSize*.02);
        flame(rocketSize*.065,C.gold,.75,Math.sin(p*190)*rocketSize*.015);
        flame(rocketSize*.025,C.white,.95,0);
        for(let i=0;i<budget.dust;i++){
          const age=(p*(6+sky*7)+noise(i,38))%1,x=(noise(i,39)-.5)*rocketSize*(.12+age*.45),y=exhaust+age*tail;
          star(x,y,(1-age)*1.4,f.overlay*f.rocket*(1-age)*.55);
        }ctx.restore();
      }
      // Perspective departure leaves one distant four-point flash rather than a screen explosion.
      const twinkle=Math.sin(ramp(ms,7860,8150)*Math.PI);
      if(twinkle>0){const x=w*.5,y=h*.345;glow(x,y,14+twinkle*18,C.cyan,twinkle*.5);ctx.globalAlpha=twinkle;ctx.fillStyle=C.white;
        ctx.beginPath();ctx.moveTo(x,y-18*twinkle);ctx.lineTo(x+3,y-3);ctx.lineTo(x+18*twinkle,y);ctx.lineTo(x+3,y+3);ctx.lineTo(x,y+18*twinkle);ctx.lineTo(x-3,y+3);ctx.lineTo(x-18*twinkle,y);ctx.lineTo(x-3,y-3);ctx.closePath();ctx.fill();}
      ctx.restore();ctx.globalAlpha=1;
    };
    // RN Web exposes the current value; prime paused/seeked/resized stages before the next tick.
    let pending:number|null=null,hidden=document.hidden,latest=(progress as unknown as {__getValue():number}).__getValue();
    const schedule=()=>{if(hidden||pending!==null)return;pending=requestAnimationFrame(()=>{pending=null;draw(latest);});};
    const listener=progress.addListener(({value})=>{latest=value;schedule();});schedule();
    const stop=()=>{hidden=true;if(pending!==null)cancelAnimationFrame(pending);pending=null;};
    const visibility=()=>{if(document.hidden)stop();else{hidden=false;schedule();}};
    document.addEventListener("visibilitychange",visibility);
    const subscription=AppState.addEventListener("change",s=>{if(s!=="active")stop();else{hidden=false;schedule();}});
    return()=>{stop();progress.removeListener(listener);document.removeEventListener("visibilitychange",visibility);subscription.remove();canvas.width=0;canvas.height=0;cloud.width=0;earth.width=0;nebula.width=0;};
  },[w,h,progress,quality,reducedMotion]);
  return <canvas aria-hidden="true" ref={ref} style={{position:"absolute",inset:0,width:w,height:h,pointerEvents:"none"}} />;
}
