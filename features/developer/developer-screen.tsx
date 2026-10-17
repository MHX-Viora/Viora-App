import { Linking, Pressable, Text, View } from "react-native";
import { getDeveloperPortalUrl } from "@/utils/developer-portal";

export default function DeveloperScreen() {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
    <Text>ANKT Developer</Text>
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(getDeveloperPortalUrl())}>
      <Text>Mở trang Developer trên trình duyệt</Text>
    </Pressable>
  </View>;
}
