import { useEffect, useRef, useMemo } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function NotificationSkeleton() {
  const { theme } = useTheme();
  const colors = theme.notifications;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 650,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 650,
          toValue: 0.45,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.avatar, { opacity }]} />
      <View style={styles.body}>
        <Animated.View style={[styles.lineLarge, { opacity }]} />
        <Animated.View style={[styles.lineFull, { opacity }]} />
        <Animated.View style={[styles.lineSmall, { opacity }]} />
      </View>
      <Animated.View style={[styles.thumb, { opacity }]} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: {
    backgroundColor: colors.border,
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  body: { flex: 1, gap: spacing.sm },
  lineFull: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 12,
    width: "88%",
  },
  lineLarge: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 14,
    width: "56%",
  },
  lineSmall: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 11,
    width: "34%",
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderRead,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  thumb: {
    backgroundColor: colors.border,
    borderRadius: 10,
    height: 54,
    width: 54,
  },
});
