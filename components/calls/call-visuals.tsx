import { type ReactNode, useEffect, useRef, useMemo } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { type ThemeColors, useTheme } from "@/theme";



export function CallBackdrop() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.cyanGlow} />
      <View style={styles.purpleGlow} />
      <View style={styles.arcLeft} />
      <View style={styles.arcRight} />
    </View>
  );
}

export function CallAvatarHalo({
  animated = false,
  children,
  size = 232,
}: {
  animated?: boolean;
  children: ReactNode;
  size?: number;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const outerPulse = useRef(new Animated.Value(0)).current;
  const middlePulse = useRef(new Animated.Value(0)).current;
  const innerPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      outerPulse.setValue(0);
      middlePulse.setValue(0);
      innerPulse.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(outerPulse, {
            duration: 1200,
            easing: Easing.out(Easing.ease),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(outerPulse, {
            duration: 700,
            easing: Easing.in(Easing.ease),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(220),
          Animated.timing(middlePulse, {
            duration: 1050,
            easing: Easing.out(Easing.ease),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(middlePulse, {
            duration: 630,
            easing: Easing.in(Easing.ease),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(420),
          Animated.timing(innerPulse, {
            duration: 900,
            easing: Easing.out(Easing.ease),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(innerPulse, {
            duration: 550,
            easing: Easing.in(Easing.ease),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [animated, innerPulse, middlePulse, outerPulse]);

  const animatedRingStyle = (value: Animated.Value, maxScale: number) => ({
    opacity: value.interpolate({
      inputRange: [0, 1],
      outputRange: [0.78, 0.24],
    }),
    transform: [
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [1, maxScale],
        }),
      },
    ],
  });

  return (
    <View style={[styles.halo, { height: size, width: size }]}>
      <Animated.View
        style={[
          styles.ring,
          styles.outerRing,
          animatedRingStyle(outerPulse, 1.12),
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          styles.middleRing,
          animatedRingStyle(middlePulse, 1.09),
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          styles.innerRing,
          animatedRingStyle(innerPulse, 1.06),
        ]}
      />
      <View style={styles.avatarContent}>{children}</View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  arcLeft: {
    borderColor: colors.visuals.rgb_36_221_228_0_13,
    borderRadius: 260,
    borderWidth: 1,
    height: 520,
    left: -350,
    position: "absolute",
    top: 70,
    width: 520,
  },
  arcRight: {
    borderColor: colors.visuals.rgb_152_80_232_0_16,
    borderRadius: 230,
    borderWidth: 1,
    bottom: -170,
    height: 460,
    position: "absolute",
    right: -300,
    width: 460,
  },
  avatarContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  cyanGlow: {
    backgroundColor: colors.visuals.rgb_36_221_228_0_12,
    borderRadius: 180,
    height: 360,
    position: "absolute",
    right: -190,
    top: -100,
    width: 360,
  },
  halo: { alignItems: "center", justifyContent: "center" },
  innerRing: {
    borderColor: colors.glow,
    height: "58%",
    shadowColor: colors.glow,
    width: "58%",
  },
  middleRing: {
    borderColor: colors.visuals.rgb_36_221_228_0_86,
    height: "78%",
    shadowColor: colors.primary,
    width: "78%",
  },
  outerRing: {
    borderColor: colors.visuals.rgb_36_221_228_0_52,
    height: "98%",
    shadowColor: colors.primary,
    width: "98%",
  },
  purpleGlow: {
    backgroundColor: colors.visuals.rgb_152_80_232_0_12,
    borderRadius: 190,
    bottom: -140,
    height: 380,
    left: -170,
    position: "absolute",
    width: 380,
  },
  ring: {
    borderRadius: 999,
    borderWidth: 2,
    position: "absolute",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
  },
});
