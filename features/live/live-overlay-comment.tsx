import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UserAvatar } from "@/components/common/user-avatar";

type Props = {
  name: string;
  text: string;
  avatarUrl?: string | null;
  stickerUrl?: string;
  isHost?: boolean;
  isPinned?: boolean;
  onPress?: () => void;
};

export function LiveOverlayComment({ name, text, avatarUrl, stickerUrl, isHost = false, isPinned = false, onPress }: Props) {
  return <Pressable
    accessibilityLabel={onPress ? `Quản lý bình luận của ${name}: ${text}` : undefined}
    accessibilityRole={onPress ? "button" : undefined}
    disabled={!onPress}
    onPress={onPress}
    style={[styles.bubble, isHost && styles.hostBubble, isPinned && styles.pinnedBubble]}
  >
    <UserAvatar displayName={name} imageUrl={avatarUrl} size={30} style={isHost && styles.hostAvatar} />
    <View style={styles.content}>
      <View style={styles.heading}>
        <Text numberOfLines={1} style={[styles.name, isHost && styles.hostName]}>{name}</Text>
        {isHost ? <Text style={styles.hostBadge}>Chủ phòng</Text> : null}
        {isPinned ? <View style={styles.pinnedBadge}><Ionicons color="#FFD36A" name="pin" size={10} /><Text style={styles.pinnedText}>Đã ghim</Text></View> : null}
      </View>
      {stickerUrl ? <Image contentFit="contain" source={{ uri: stickerUrl }} style={styles.sticker} /> : <Text numberOfLines={1} style={styles.message}>{text}</Text>}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(10, 19, 32, 0.76)",
    borderRadius: 13,
    flexDirection: "row",
    gap: 7,
    maxWidth: "100%",
    minHeight: 42,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  hostBubble: {
    backgroundColor: "rgba(83, 55, 13, 0.86)",
  },
  pinnedBubble: { backgroundColor: "rgba(25, 24, 37, 0.9)" },
  pinnedBadge: { alignItems: "center", flexDirection: "row", gap: 2 },
  pinnedText: { color: "#FFD36A", fontSize: 9, fontWeight: "800" },
  hostAvatar: { opacity: 0.96 },
  content: { flexShrink: 1, minWidth: 0 },
  heading: { alignItems: "center", flexDirection: "row", gap: 6 },
  name: { color: "#FFFFFF", flexShrink: 1, fontSize: 11, fontWeight: "800" },
  hostName: { color: "#FFD16A" },
  hostBadge: { backgroundColor: "#F5BC48", borderRadius: 4, color: "#3C2706", fontSize: 9, fontWeight: "800", overflow: "hidden", paddingHorizontal: 5, paddingVertical: 2 },
  message: { color: "#EDF3FA", fontSize: 11, lineHeight: 15, marginTop: 2 },
  sticker: { height: 30, marginTop: 2, width: 30 },
});
