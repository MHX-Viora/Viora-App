import { memo, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { UserAvatar } from "@/components/common/user-avatar";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { orbitalLayout, ORBITAL_COLORS as C } from "./rocket-orbital-model";

export const RocketSenderHero=memo(function RocketSenderHero({bounds,effect,progress,reducedMotion}:SceneProps){
  const l=orbitalLayout(bounds),bounce=useRef(new Animated.Value(1)).current,last=useRef(effect.quantity);
  useEffect(()=>{
    if(last.current===effect.quantity)return;last.current=effect.quantity;if(reducedMotion)return;
    const a=Animated.sequence([Animated.timing(bounce,{toValue:1.2,duration:130,easing:Easing.out(Easing.quad),useNativeDriver:true,isInteraction:false}),Animated.timing(bounce,{toValue:1,duration:230,useNativeDriver:true,isInteraction:false})]);a.start();return()=>a.stop();
  },[effect.quantity,reducedMotion,bounce]);
  const v=(ms:number[],values:number[])=>progress.interpolate({inputRange:ms.map(x=>x/8500),outputRange:values,extrapolate:"clamp"});
  const reveal=(start:number,end:number)=>v([0,start,end,7800,8500],[0,0,1,1,0]);
  return <Animated.View pointerEvents="none" style={[styles.card,{width:l.cardWidth,minHeight:l.cardHeight,left:l.compact?bounds.width*.32:(bounds.width-l.cardWidth)/2,top:l.cardTop,
    opacity:reveal(0,180),transform:[{translateY:reducedMotion?0:v([0,800,1800,7800,8500],[8,8,-8,-8,-18])}]}]}>
    <Animated.View style={[styles.energyLine,{transform:[{scaleX:v([0,200,500,8500],[.01,.3,1,1])}]}]} />
    <Animated.View style={[styles.avatarRing,{width:l.compact?38:54,height:l.compact?38:54,opacity:reveal(140,360),transform:[{scale:reducedMotion?1:v([0,140,360,8500],[.5,.5,1,1])}]}]}>
      <Animated.View style={[styles.orbit,{transform:[{rotate:reducedMotion?"0deg":v([0,8500],[0,360]).interpolate({inputRange:[0,360],outputRange:["0deg","360deg"]})}]}]}><View style={styles.satellite}/></Animated.View>
      <UserAvatar imageUrl={effect.senderAvatarUrl} displayName={effect.senderName} size={l.compact?30:44}/>
    </Animated.View>
    <View style={styles.copy}>
      <Animated.Text numberOfLines={1} style={[styles.name,{fontSize:l.compact?18:28,opacity:reveal(280,520)}]}>{effect.senderName}</Animated.Text>
      <Animated.Text numberOfLines={1} style={[styles.caption,{fontSize:l.compact?9:11,opacity:reveal(440,650)}]}>ĐÃ PHÓNG TÊN LỬA</Animated.Text>
    </View>
    <Animated.Text style={[styles.quantity,{fontSize:l.compact?16:24,opacity:reveal(560,800),transform:[{scale:bounce}]}]}>×{effect.quantity}</Animated.Text>
  </Animated.View>;
});
const styles=StyleSheet.create({
  card:{position:"absolute",borderRadius:22,borderWidth:1,borderColor:C.champagne,backgroundColor:"rgba(10,13,29,.90)",flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14,paddingVertical:10,shadowColor:C.gold,shadowOpacity:.3,shadowRadius:16,shadowOffset:{width:0,height:0}},
  energyLine:{position:"absolute",left:18,right:18,top:0,height:1,backgroundColor:C.white},
  avatarRing:{borderRadius:40,borderWidth:2,borderColor:C.gold,alignItems:"center",justifyContent:"center"},
  orbit:{position:"absolute",inset:-4,borderRadius:40,borderWidth:1,borderColor:"rgba(244,207,136,.35)"},
  satellite:{width:4,height:4,backgroundColor:C.white,borderRadius:4,position:"absolute",top:-2,left:"50%"},
  copy:{flex:1,minWidth:0},name:{fontWeight:"800",color:"#FFF3B0",textShadowColor:"rgba(255,157,46,.35)",textShadowRadius:5,textShadowOffset:{width:0,height:1}},
  caption:{color:"#D5DEE9",fontWeight:"600",letterSpacing:.7,marginTop:3},quantity:{fontWeight:"800",color:C.gold},
});
