import { Image, StyleSheet, View } from "react-native";

import {
  APP_LAUNCH_ARTWORK_ASPECT_RATIO,
  APP_LAUNCH_ARTWORK_WIDTH,
} from "@/components/layout/app-launch-layout";

export function AppLaunchScreen() {
  return (
    <View
      accessibilityLabel="Đang khởi động Mạng xã hội ANKT"
      accessibilityRole="progressbar"
      style={styles.screen}
    >
      <Image
        accessibilityLabel="Logo Mạng xã hội ANKT"
        fadeDuration={0}
        resizeMode="contain"
        source={require("../../assets/images/ankt_launch_safe.png")}
        style={styles.artwork}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    aspectRatio: APP_LAUNCH_ARTWORK_ASPECT_RATIO,
    width: APP_LAUNCH_ARTWORK_WIDTH,
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "#000000",
    justifyContent: "center",
    zIndex: 100,
  },
});
