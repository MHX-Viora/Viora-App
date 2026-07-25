import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { communityColors as colors } from "@/features/feed/community-colors";

export const FIXED_TOP_BAR_HEIGHT = 100;

export function FixedTopBar({ children }: PropsWithChildren) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    height: FIXED_TOP_BAR_HEIGHT,
    justifyContent: "flex-end",
    left: 0,
    paddingTop: 60,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
});
