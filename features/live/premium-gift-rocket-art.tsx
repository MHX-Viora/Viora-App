import { memo } from "react";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { ROCKET_COLORS as C } from "./premium-gift-rocket-model";

export const PremiumRocketArt = memo(function PremiumRocketArt({ height }: { height: number }) {
  return <Svg aria-hidden height={height} viewBox="0 0 160 280" width={height * .64}>
    <Defs>
      <LinearGradient id="rocketMetal" x1="0" x2="1"><Stop offset="0" stopColor="#173657" /><Stop offset=".18" stopColor="#55A5C0" /><Stop offset=".34" stopColor="#D6F5FF" /><Stop offset=".5" stopColor="#F8FAFF" /><Stop offset=".68" stopColor="#809BAD" /><Stop offset="1" stopColor="#122238" /></LinearGradient>
      <LinearGradient id="rocketCopper" x1="0" x2="1"><Stop offset="0" stopColor="#801E2B" /><Stop offset=".32" stopColor={C.orange} /><Stop offset=".5" stopColor="#FFE6A2" /><Stop offset=".75" stopColor={C.red} /><Stop offset="1" stopColor="#631637" /></LinearGradient>
      <LinearGradient id="rocketWindow" x1="0" x2="1" y1="0" y2="1"><Stop stopColor="#DCF9FF" /><Stop offset=".35" stopColor={C.cyan} /><Stop offset=".7" stopColor={C.blue} /><Stop offset="1" stopColor="#07122F" /></LinearGradient>
    </Defs>
    <Path d="M47 166 Q21 180 15 229 L52 214Z M113 166 Q139 180 145 229 L108 214Z" fill="url(#rocketCopper)" stroke={C.gold} strokeWidth="1.5" />
    <Path d="M80 9 C52 36 44 75 44 122 L47 192 Q80 211 113 192 L116 122 C116 75 108 36 80 9Z" fill="url(#rocketMetal)" stroke="#93DFF4" strokeWidth="1.5" />
    <Path d="M80 9 C63 26 53 46 49 68 Q80 79 111 68 C107 46 97 26 80 9Z" fill="url(#rocketCopper)" />
    <Path d="M60 73 Q53 118 56 177" fill="none" opacity=".85" stroke="#F8FFFF" strokeLinecap="round" strokeWidth="4" />
    <Path d="M110 85 L108 181" fill="none" opacity=".6" stroke={C.cyan} strokeWidth="2" />
    <Circle cx="80" cy="113" fill="#071B30" r="25" stroke="url(#rocketCopper)" strokeWidth="5" />
    <Circle cx="80" cy="113" fill="url(#rocketWindow)" r="18" stroke="#91EFFF" strokeWidth="1.5" />
    <Path d="M69 103 Q76 95 85 101" fill="none" stroke="#F0FFFF" strokeLinecap="round" strokeWidth="3" />
    <Path d="M50 178 Q80 192 110 178 L111 194 Q80 212 49 194Z" fill="url(#rocketCopper)" />
    <Path d="M56 199 L59 224 Q80 237 101 224 L104 199Z" fill="#1D3145" stroke="#F0BD63" strokeWidth="2" />
    <Ellipse cx="80" cy="228" fill="#082541" rx="22" ry="7" stroke={C.cyan} strokeWidth="3" />
    <Ellipse cx="80" cy="228" fill="#E7FEFF" rx="14" ry="4" />
    <Path d="M77 153 L80 143 L83 153 L93 156 L83 159 L80 170 L77 159 L67 156Z" fill={C.gold} />
    {[59, 101].map((x) => <Rect key={x} fill="#AAEDFF" height="10" rx="1" width="2" x={x} y="150" />)}
  </Svg>;
});
