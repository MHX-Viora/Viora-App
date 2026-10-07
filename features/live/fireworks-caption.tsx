import { Animated, StyleSheet, Text } from "react-native";
import type { SceneProps } from "./premium-gift-cinematic-parts";

export function FireworksCaption({bounds,effect,progress}:SceneProps) {
  return <Animated.View style={[styles.caption,{top:bounds.height<400?bounds.height*.72:bounds.height*.53,left:bounds.height<400?bounds.width*.72:undefined,maxWidth:bounds.width*(bounds.height<400?.27:.84),opacity:progress.interpolate({inputRange:[0,.16,.20,.43,.47,1],outputRange:[0,0,1,1,0,0],extrapolate:"clamp"})}]}>
    <Text numberOfLines={1} style={styles.sender}>{effect.senderName}</Text>
    <Text style={styles.title}>✦ THẮP SÁNG BẦU TRỜI ✦</Text>
  </Animated.View>;
}
const styles=StyleSheet.create({caption:{position:"absolute",alignSelf:"center",alignItems:"center",paddingHorizontal:12,paddingVertical:7,borderRadius:12,backgroundColor:"rgba(9,14,30,.5)"},sender:{color:"#FFFFFF",fontSize:16,fontWeight:"800",textShadowColor:"#071426",textShadowRadius:5,textShadowOffset:{width:0,height:1}},title:{color:"#FFE29A",fontSize:10,letterSpacing:1.2,marginTop:4}});
