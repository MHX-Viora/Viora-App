import Ionicons from "@expo/vector-icons/Ionicons";
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

export type LiveHeartBurstHandle = { burst: () => void };

type HeartParticle = {
  id: number;
  color: string;
  delay: number;
  drift: number;
  rise: number;
  size: number;
};

const colors = ["#FF347B", "#FF6A9E", "#FFC0D7", "#FFFFFF", "#F72585"];
const drifts = [-28, 13, -9, 31, -35, 20, 2];

export const LiveHeartBurst = forwardRef<LiveHeartBurstHandle>(function LiveHeartBurst(_props, ref) {
  const nextId = useRef(0);
  const [particles, setParticles] = useState<HeartParticle[]>([]);
  const remove = useCallback((id: number) => setParticles((current) => current.filter((heart) => heart.id !== id)), []);
  const burst = useCallback(() => {
    const batch = drifts.map((drift, index) => {
      const id = nextId.current++;
      return {
        id,
        color: colors[(id + index) % colors.length],
        delay: index * 38,
        drift: drift + (id % 3) * 5,
        rise: 195 + index * 23,
        size: 17 + (index % 4) * 3,
      };
    });
    setParticles((current) => [...current.slice(-63), ...batch]);
  }, []);

  useImperativeHandle(ref, () => ({ burst }), [burst]);

  return <View pointerEvents="none" style={styles.layer}>
    {particles.map((heart) => <FlyingHeart heart={heart} key={heart.id} onDone={remove} />)}
  </View>;
});

const FlyingHeart = memo(function FlyingHeart({ heart, onDone }: { heart: HeartParticle; onDone: (id: number) => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      delay: heart.delay,
      duration: 1250 + heart.delay,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => { if (finished) onDone(heart.id); });
    return () => animation.stop();
  }, [heart, onDone, progress]);

  return <Animated.View style={[styles.particle, { left: -heart.size / 2, top: -heart.size / 2 }, {
    opacity: progress.interpolate({ inputRange: [0, 0.12, 0.72, 1], outputRange: [0, 1, 0.85, 0] }),
    transform: [
      { translateX: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, heart.drift * 0.4, heart.drift] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -heart.rise] }) },
      { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.55, 1.2, 0.8] }) },
    ],
  }]}>
    <Ionicons color={heart.color} name="heart" size={heart.size} />
  </Animated.View>;
});

const styles = StyleSheet.create({
  layer: { height: 1, left: "50%", position: "absolute", top: 16, width: 1, zIndex: 5 },
  particle: { position: "absolute" },
});
