import { memo } from "react";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

export const CinematicCrownArt = memo(function CinematicCrownArt({ width }: { width: number }) {
  return <Svg height={width * 0.73} viewBox="0 0 320 234" width={width}>
    <Defs>
      <LinearGradient id="crownMetal" x1="0" x2="1" y1="0" y2="0.35">
        <Stop offset="0" stopColor="#744019" /><Stop offset="0.14" stopColor="#E6B85C" />
        <Stop offset="0.31" stopColor="#FFF3B9" /><Stop offset="0.49" stopColor="#CB8935" />
        <Stop offset="0.64" stopColor="#FFE4A0" /><Stop offset="0.84" stopColor="#BD7428" />
        <Stop offset="1" stopColor="#6E3817" />
      </LinearGradient>
      <LinearGradient id="crownFacet" x1="0" x2="1" y1="0" y2="1">
        <Stop offset="0" stopColor="#FFF4C9" /><Stop offset="0.47" stopColor="#E4AB4C" />
        <Stop offset="1" stopColor="#8A4B20" />
      </LinearGradient>
      <LinearGradient id="crownBand" x1="0" x2="0" y1="0" y2="1">
        <Stop offset="0" stopColor="#FFF0AF" /><Stop offset="0.2" stopColor="#B7742D" />
        <Stop offset="0.52" stopColor="#F4C76B" /><Stop offset="0.85" stopColor="#9D5D27" />
        <Stop offset="1" stopColor="#643719" />
      </LinearGradient>
      <RadialGradient id="ruby"><Stop offset="0" stopColor="#FFB1AC" /><Stop offset="0.28" stopColor="#E54758" /><Stop offset="0.78" stopColor="#8B1B35" /><Stop offset="1" stopColor="#491329" /></RadialGradient>
      <RadialGradient id="sapphire"><Stop offset="0" stopColor="#E5FCFF" /><Stop offset="0.36" stopColor="#62BBD3" /><Stop offset="1" stopColor="#1E4968" /></RadialGradient>
    </Defs>
    <Path d="M29 74 L101 113 L160 19 L219 113 L291 74 L271 175 L49 175Z" fill="#653716" opacity="0.6" />
    <Path d="M30 74 L101 112 L160 19 L219 112 L290 74 L268 173 L52 173Z" fill="url(#crownMetal)" stroke="#FDE3A5" strokeWidth="2.4" />
    <Path d="M31 75 L101 112 L83 165 L52 173Z" fill="#8A4D24" opacity="0.73" />
    <Path d="M289 75 L219 112 L237 165 L268 173Z" fill="#A05D24" opacity="0.69" />
    <Path d="M101 112 L160 21 L145 164 L84 165Z" fill="url(#crownFacet)" opacity="0.78" />
    <Path d="M219 112 L160 21 L175 164 L236 165Z" fill="#D89A44" opacity="0.62" />
    <Path d="M144 164 L160 21 L176 164Z" fill="#FFE9A1" opacity="0.44" />
    <Path d="M49 161 C111 174 209 174 271 161 L277 196 C207 213 113 213 43 196Z" fill="url(#crownBand)" stroke="#FBE6AD" strokeWidth="2" />
    <Path d="M44 194 C116 210 204 210 276 194 L272 205 C209 222 111 222 48 205Z" fill="#63351B" stroke="#D89B49" strokeWidth="2" />
    <Path d="M57 169 C120 180 200 180 264 169" fill="none" opacity="0.7" stroke="#FFF6C9" strokeWidth="2" />
    <Path d="M56 192 C124 207 196 207 264 192" fill="none" opacity="0.43" stroke="#FFF1BA" strokeWidth="1.5" />
    <Path d="M57 76 L101 116 M160 31 L160 159 M263 76 L219 116" fill="none" opacity="0.58" stroke="#FFF8D8" strokeLinecap="round" strokeWidth="2.4" />
    <Path d="M125 76 L111 132 M194 75 L209 132" fill="none" opacity="0.32" stroke="#FFF4C5" strokeWidth="1.8" />
    <Ellipse cx="160" cy="183" fill="#582D1A" rx="24" ry="19" />
    <Path d="M160 162 L178 182 L160 202 L142 182Z" fill="url(#ruby)" stroke="#FFEBC1" strokeWidth="4" />
    <Path d="M160 165 L160 198 M144 182 L175 182" fill="none" opacity="0.5" stroke="#FFE9E2" strokeWidth="1.3" />
    <Path d="M92 175 L104 184 L92 194 L80 184Z M228 175 L240 184 L228 194 L216 184Z" fill="url(#sapphire)" stroke="#FFF2C7" strokeWidth="3" />
    <Circle cx="30" cy="73" fill="#FFF1BE" r="7" stroke="#BD792E" strokeWidth="3" />
    <Circle cx="160" cy="19" fill="#FFF5CF" r="8" stroke="#BD792E" strokeWidth="3" />
    <Circle cx="290" cy="73" fill="#FFF1BE" r="7" stroke="#BD792E" strokeWidth="3" />
    <Circle cx="160" cy="19" fill="#FFFFFF" opacity="0.75" r="2.5" />
  </Svg>;
});

export const CinematicRocketArt = memo(function CinematicRocketArt({ width }: { width: number }) {
  return <Svg height={width * 1.67} viewBox="0 0 210 350" width={width}>
    <Defs>
      <LinearGradient id="rocketShell" x1="0" x2="1" y1="0" y2="0.18">
        <Stop offset="0" stopColor="#62768E" /><Stop offset="0.16" stopColor="#D5E3EA" />
        <Stop offset="0.34" stopColor="#FFFFFF" /><Stop offset="0.56" stopColor="#DBE5E8" />
        <Stop offset="0.76" stopColor="#8BA1B4" /><Stop offset="1" stopColor="#4C627A" />
      </LinearGradient>
      <LinearGradient id="rocketCopper" x1="0" x2="1" y1="0" y2="1">
        <Stop offset="0" stopColor="#FFE3B1" /><Stop offset="0.42" stopColor="#D98E5B" /><Stop offset="0.78" stopColor="#893C3D" /><Stop offset="1" stopColor="#4A2D45" />
      </LinearGradient>
      <RadialGradient id="rocketWindow"><Stop offset="0" stopColor="#DDF8FF" /><Stop offset="0.4" stopColor="#73B8D4" /><Stop offset="1" stopColor="#183D67" /></RadialGradient>
      <LinearGradient id="rocketFlame" x1="0" x2="0" y1="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.23" stopColor="#FFF6C3" /><Stop offset="0.52" stopColor="#FFB465" /><Stop offset="1" stopColor="#D35268" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    <Path d="M68 262 C62 294 78 318 105 349 C132 318 148 294 142 262Z" fill="url(#rocketFlame)" opacity="0.76" />
    <Path d="M88 266 C86 298 96 320 105 337 C114 320 124 298 122 266Z" fill="#FFF9DC" opacity="0.85" />
    <Path d="M68 227 L23 292 Q60 291 84 274Z M142 227 L187 292 Q150 291 126 274Z" fill="url(#rocketCopper)" stroke="#FFDEA7" strokeWidth="2.5" />
    <Path d="M105 15 C151 60 154 126 143 267 Q105 281 67 267 C56 126 59 60 105 15Z" fill="url(#rocketShell)" stroke="#F8FBF5" strokeWidth="2" />
    <Path d="M105 15 C128 38 141 69 146 98 Q105 111 64 98 C69 69 82 38 105 15Z" fill="url(#rocketCopper)" stroke="#FFE0A8" strokeWidth="2" />
    <Path d="M65 103 Q105 114 145 103 M67 224 Q105 235 143 224" fill="none" opacity="0.74" stroke="#52687D" strokeWidth="5" />
    <Path d="M74 115 Q65 172 74 228" fill="none" opacity="0.6" stroke="#FFFFFF" strokeWidth="6" />
    <Path d="M133 112 Q144 181 134 226" fill="none" opacity="0.48" stroke="#52677E" strokeWidth="5" />
    <Circle cx="105" cy="161" fill="#3C536C" r="31" stroke="#D4AB74" strokeWidth="7" />
    <Circle cx="105" cy="161" fill="url(#rocketWindow)" r="25" stroke="#EEF7F8" strokeWidth="2" />
    <Path d="M88 153 Q100 139 118 145" fill="none" opacity="0.75" stroke="#F6FFFF" strokeLinecap="round" strokeWidth="4" />
    <Path d="M84 246 Q105 255 126 246 L121 275 Q105 281 89 275Z" fill="url(#rocketCopper)" stroke="#F7D4A7" strokeWidth="2" />
    <Path d="M90 62 Q105 52 120 62" fill="none" opacity="0.48" stroke="#FFF3D9" strokeWidth="2" />
    <Circle cx="76" cy="114" fill="#FBE4BB" r="2" /><Circle cx="134" cy="114" fill="#FBE4BB" r="2" />
    <Circle cx="73" cy="224" fill="#FBE4BB" r="2" /><Circle cx="137" cy="224" fill="#FBE4BB" r="2" />
  </Svg>;
});
