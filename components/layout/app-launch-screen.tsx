import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export function AppLaunchScreen() {
  return (
    <View
      accessibilityLabel="Đang khởi động Mạng xã hội ANKT"
      accessibilityRole="progressbar"
      style={styles.screen}
    >
      <Image
        accessibilityLabel="Logo Mạng xã hội ANKT"
        contentFit="contain"
        source={require("../../assets/images/ankt_launch.jpg")}
        style={styles.artwork}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    height: "100%",
    width: "100%",
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    zIndex: 100,
  },
});
